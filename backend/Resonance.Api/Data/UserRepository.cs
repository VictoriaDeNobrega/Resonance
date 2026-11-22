using Microsoft.EntityFrameworkCore;
using Resonance.Api.DTOs;
using Resonance.Api.Models;

namespace Resonance.Api.Data;

public class UserRepository
{
    private readonly AppDbContext _db;

    public UserRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<User?> GetByIdAsync(Guid userId, bool track = true, CancellationToken ct = default)
    {
        IQueryable<User> query = track ? _db.Users : _db.Users.AsNoTracking();
        return query.FirstOrDefaultAsync(u => u.Id == userId, ct);
    }

    public Task<User?> GetByEmailAsync(string normalizedEmail, bool track = true, CancellationToken ct = default)
    {
        IQueryable<User> query = track ? _db.Users : _db.Users.AsNoTracking();
        return query.FirstOrDefaultAsync(u => u.Email == normalizedEmail, ct);
    }

    public Task<User?> GetByConfirmationTokenAsync(string token, string? normalizedEmail, CancellationToken ct = default)
    {
        IQueryable<User> query = _db.Users;
        if (!string.IsNullOrWhiteSpace(normalizedEmail))
        {
            query = query.Where(u => u.Email == normalizedEmail);
        }

        return query.FirstOrDefaultAsync(u => u.ConfirmationToken == token, ct);
    }

    public Task<bool> EmailExistsAsync(string normalizedEmail, Guid? excludeUserId = null, CancellationToken ct = default)
    {
        IQueryable<User> query = _db.Users.Where(u => u.Email == normalizedEmail);
        if (excludeUserId.HasValue)
        {
            query = query.Where(u => u.Id != excludeUserId.Value);
        }

        return query.AnyAsync(ct);
    }

    public Task<bool> SongExistsAsync(Guid songId, CancellationToken ct = default) =>
        _db.Songs.AnyAsync(s => s.Id == songId, ct);

    public async Task<(int PlaylistsCount, int FavoritesCount, int CommunitiesCount)> GetProfileCountsAsync(
        Guid userId,
        CancellationToken ct = default)
    {
        var playlistsCount = await _db.Playlists.CountAsync(p => p.UserId == userId, ct);
        var favoritesCount = await _db.UserFavoriteSongs.CountAsync(f => f.UserId == userId, ct);
        var communitiesCount = await _db.CommunityMembers.CountAsync(m => m.UserId == userId, ct);
        return (playlistsCount, favoritesCount, communitiesCount);
    }

    public async Task AddAsync(User user, CancellationToken ct = default)
    {
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
    }

    public async Task SaveProfileWithNameCascadeAsync(User user, bool nameChanged, CancellationToken ct = default)
    {
        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        await _db.SaveChangesAsync(ct);

        if (nameChanged)
        {
            await _db.Playlists.Where(p => p.UserId == user.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(p => p.AuthorName, user.Name), ct);
            await _db.Communities.Where(c => c.CreatorId == user.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(c => c.CreatorName, user.Name), ct);
            await _db.CommunityMembers.Where(m => m.UserId == user.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(m => m.UserName, user.Name), ct);
            await _db.CommunityComments.Where(cc => cc.AuthorId == user.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(cc => cc.AuthorName, user.Name), ct);
            await _db.Rooms.Where(r => r.HostId == user.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(r => r.HostName, user.Name), ct);
            await _db.Reviews.Where(r => r.UserId == user.Id)
                .ExecuteUpdateAsync(s => s.SetProperty(r => r.UserName, user.Name), ct);
        }

        await tx.CommitAsync(ct);
    }

    public Task<int> SaveChangesAsync(CancellationToken ct = default) => _db.SaveChangesAsync(ct);

    public Task<List<UserSearchItemDto>> SearchByPrefixAsync(string? query, int limit = 20, CancellationToken ct = default)
    {
        var clampedLimit = Math.Clamp(limit, 1, 50);
        IQueryable<User> usersQuery = _db.Users.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query))
        {
            var prefix = $"{query.Trim()}%";
            usersQuery = usersQuery.Where(u =>
                EF.Functions.ILike(u.Name, prefix) ||
                EF.Functions.ILike(u.Email, prefix));
        }

        return usersQuery
            .OrderBy(u => u.Name)
            .Take(clampedLimit)
            .Select(u => new UserSearchItemDto
            {
                Id = u.Id,
                Name = u.Name,
                Email = u.Email,
                AvatarUrl = u.AvatarUrl,
                Bio = u.Bio,
                PublicPlaylistsCount = u.Playlists.Count(p => p.IsPublic)
            })
            .ToListAsync(ct);
    }
}
