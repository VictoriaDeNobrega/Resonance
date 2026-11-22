using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using Resonance.Api.DTOs;
using Resonance.Api.Models;

namespace Resonance.Api.Data;

public class RoomRepository
{
    private readonly AppDbContext _db;

    public RoomRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<List<Room>> GetActiveRoomsAsync(string? genre = null, string? search = null, CancellationToken ct = default)
    {
        IQueryable<Room> query = _db.Rooms
            .AsNoTracking()
            .Where(r => r.IsActive)
            .Include(r => r.Queue);

        if (!string.IsNullOrWhiteSpace(genre))
        {
            var genrePrefix = $"{genre.Trim()}%";
            query = query.Where(r => EF.Functions.ILike(r.Genre, genrePrefix));
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var prefix = $"{search.Trim()}%";
            query = query.Where(r =>
                EF.Functions.ILike(r.Title, prefix) ||
                EF.Functions.ILike(r.Code, prefix) ||
                EF.Functions.ILike(r.HostName, prefix) ||
                EF.Functions.ILike(r.Genre, prefix));
        }

        return query
            .OrderByDescending(r => r.ListenerCount)
            .ThenByDescending(r => r.CreatedAt)
            .ToListAsync(ct);
    }

    public Task<Room?> GetByCodeWithDetailsAsync(string normalizedCode, bool track = false, CancellationToken ct = default)
    {
        IQueryable<Room> query = track ? _db.Rooms : _db.Rooms.AsNoTracking();
        return query
            .Include(r => r.Queue)
            .Include(r => r.Messages.OrderBy(m => m.SentAt))
            .FirstOrDefaultAsync(r => r.Code == normalizedCode, ct);
    }

    public Task<Room?> GetByCodeWithQueueAsync(string normalizedCode, bool track = true, CancellationToken ct = default)
    {
        IQueryable<Room> query = track ? _db.Rooms : _db.Rooms.AsNoTracking();
        return query.Include(r => r.Queue).FirstOrDefaultAsync(r => r.Code == normalizedCode, ct);
    }

    public Task<Room?> GetByCodeAsync(string normalizedCode, bool track = true, CancellationToken ct = default)
    {
        IQueryable<Room> query = track ? _db.Rooms : _db.Rooms.AsNoTracking();
        return query.FirstOrDefaultAsync(r => r.Code == normalizedCode, ct);
    }

    public Task<User?> FindUserAsync(Guid userId, bool track = false, CancellationToken ct = default)
    {
        IQueryable<User> query = track ? _db.Users : _db.Users.AsNoTracking();
        return query.FirstOrDefaultAsync(u => u.Id == userId, ct);
    }

    public Task<Song?> FindSongAsync(Guid songId, CancellationToken ct = default) =>
        _db.Songs.AsNoTracking().FirstOrDefaultAsync(s => s.Id == songId, ct);

    public async Task<string> GenerateUniqueRoomCodeAsync(CancellationToken ct = default)
    {
        for (var attempt = 0; attempt < 20; attempt++)
        {
            var number = RandomNumberGenerator.GetInt32(1000, 10000);
            var candidate = $"RES-{number}";
            if (!await _db.Rooms.AnyAsync(r => r.Code == candidate, ct))
            {
                return candidate;
            }
        }

        return $"RES-{Guid.NewGuid().ToString("N")[..6].ToUpperInvariant()}";
    }

    public void AddRoom(Room room) => _db.Rooms.Add(room);

    public void RemoveRoom(Room room) => _db.Rooms.Remove(room);

    public void AddRoomSong(RoomSong roomSong) => _db.RoomSongs.Add(roomSong);

    public void RemoveRoomSong(RoomSong roomSong) => _db.RoomSongs.Remove(roomSong);

    public Task<List<RoomMessage>> GetMessagesAsync(Guid roomId, int limit, CancellationToken ct = default)
    {
        var safeLimit = Math.Clamp(limit, 1, 250);
        return _db.RoomMessages
            .AsNoTracking()
            .Where(m => m.RoomId == roomId)
            .OrderByDescending(m => m.SentAt)
            .Take(safeLimit)
            .OrderBy(m => m.SentAt)
            .ToListAsync(ct);
    }

    public async Task AddMessageAsync(RoomMessage message, CancellationToken ct = default)
    {
        _db.RoomMessages.Add(message);
        await _db.SaveChangesAsync(ct);
    }

    public Task ClearActiveRoomCodeAsync(string roomCode, CancellationToken ct = default) =>
        _db.Users
            .Where(u => u.ActiveRoomCode == roomCode)
            .ExecuteUpdateAsync(s => s.SetProperty(u => u.ActiveRoomCode, (string?)null), ct);

    public Task<int> SaveChangesAsync(CancellationToken ct = default) => _db.SaveChangesAsync(ct);

    public async Task<ServiceResult<T>> ExecuteInTransactionAsync<T>(
        Func<Task<ServiceResult<T>>> operation,
        CancellationToken ct = default)
    {
        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        var result = await operation();
        if (result.Success)
        {
            await tx.CommitAsync(ct);
        }

        return result;
    }
}
