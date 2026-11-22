using Microsoft.EntityFrameworkCore;
using Resonance.Api.DTOs;
using Resonance.Api.Models;

namespace Resonance.Api.Data;

public class PlaylistRepository
{
    private readonly AppDbContext _db;

    public PlaylistRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<User?> FindUserAsync(Guid userId, CancellationToken ct = default) =>
        _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);

    public Task<Song?> FindSongAsync(Guid songId, CancellationToken ct = default) =>
        _db.Songs.AsNoTracking().FirstOrDefaultAsync(s => s.Id == songId, ct);

    public Task<Playlist?> GetByIdAsync(Guid playlistId, bool track = true, CancellationToken ct = default)
    {
        IQueryable<Playlist> query = track ? _db.Playlists : _db.Playlists.AsNoTracking();
        return query.FirstOrDefaultAsync(p => p.Id == playlistId, ct);
    }

    public Task<Playlist?> GetByIdWithSongsAsync(Guid playlistId, bool track = false, CancellationToken ct = default)
    {
        IQueryable<Playlist> query = track ? _db.Playlists : _db.Playlists.AsNoTracking();
        return query
            .Include(p => p.PlaylistSongs.OrderBy(ps => ps.OrderIndex))
                .ThenInclude(ps => ps.Song)
            .FirstOrDefaultAsync(p => p.Id == playlistId, ct);
    }

    public Task<List<Playlist>> GetByUserIdAsync(Guid userId, CancellationToken ct = default) =>
        _db.Playlists
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .Include(p => p.PlaylistSongs.OrderBy(ps => ps.OrderIndex))
                .ThenInclude(ps => ps.Song)
            .OrderByDescending(p => p.UpdatedAt)
            .ToListAsync(ct);

    public Task<List<Playlist>> GetPublicAsync(
        Guid? excludeUserId = null,
        string? search = null,
        int? limit = null,
        CancellationToken ct = default)
    {
        IQueryable<Playlist> query = _db.Playlists
            .AsNoTracking()
            .Where(p => p.IsPublic)
            .Include(p => p.PlaylistSongs)
                .ThenInclude(ps => ps.Song);

        if (excludeUserId.HasValue && excludeUserId.Value != Guid.Empty)
        {
            query = query.Where(p => p.UserId != excludeUserId.Value);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var prefix = $"{search.Trim()}%";
            query = query.Where(p =>
                EF.Functions.ILike(p.Name, prefix) ||
                EF.Functions.ILike(p.AuthorName, prefix));
        }

        query = query.OrderByDescending(p => p.UpdatedAt);
        if (limit.HasValue)
        {
            query = query.Take(limit.Value);
        }

        return query.ToListAsync(ct);
    }

    public async Task AddAsync(Playlist playlist, CancellationToken ct = default)
    {
        _db.Playlists.Add(playlist);
        await _db.SaveChangesAsync(ct);
    }

    public async Task UpdateWithCommunityTitleSyncAsync(Playlist playlist, bool nameChanged, CancellationToken ct = default)
    {
        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        await _db.SaveChangesAsync(ct);

        if (nameChanged)
        {
            await _db.CommunityPlaylists
                .Where(cp => cp.PlaylistId == playlist.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(cp => cp.PlaylistTitle, playlist.Name), ct);
        }

        await tx.CommitAsync(ct);
    }

    public async Task RemoveAsync(Playlist playlist, CancellationToken ct = default)
    {
        _db.Playlists.Remove(playlist);
        await _db.SaveChangesAsync(ct);
    }

    public void AddPlaylistSong(PlaylistSong entry) => _db.PlaylistSongs.Add(entry);

    public void RemovePlaylistSong(PlaylistSong entry) => _db.PlaylistSongs.Remove(entry);

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
