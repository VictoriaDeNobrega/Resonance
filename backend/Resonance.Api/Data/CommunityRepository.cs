using Microsoft.EntityFrameworkCore;
using Resonance.Api.Models;

namespace Resonance.Api.Data;

public class CommunityRepository
{
    private readonly AppDbContext _db;

    public CommunityRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<List<Community>> GetFilteredAsync(
        string? search = null,
        CommunityCategoryType? categoryType = null,
        string? categoryValue = null,
        int? limit = null,
        bool orderByMembersDesc = true,
        CancellationToken ct = default)
    {
        IQueryable<Community> query = _db.Communities
            .AsNoTracking()
            .Include(c => c.Members)
            .Include(c => c.CommunityPlaylists)
            .Include(c => c.CommunitySongs)
            .Include(c => c.Comments);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var prefix = $"{search.Trim()}%";
            query = query.Where(c =>
                EF.Functions.ILike(c.Name, prefix) ||
                EF.Functions.ILike(c.CategoryValue, prefix));
        }

        if (categoryType.HasValue)
        {
            query = query.Where(c => c.CategoryType == categoryType.Value);
        }

        if (!string.IsNullOrWhiteSpace(categoryValue))
        {
            var catPrefix = $"{categoryValue.Trim()}%";
            query = query.Where(c => EF.Functions.ILike(c.CategoryValue, catPrefix));
        }

        query = orderByMembersDesc
            ? query.OrderByDescending(c => c.Members.Count).ThenBy(c => c.Name)
            : query.OrderBy(c => c.Name);

        if (limit.HasValue)
        {
            query = query.Take(limit.Value);
        }

        return query.ToListAsync(ct);
    }

    public Task<Community?> GetByIdWithDetailsAsync(Guid communityId, CancellationToken ct = default) =>
        _db.Communities
            .AsNoTracking()
            .Include(c => c.Members.OrderBy(m => m.JoinedAt))
            .Include(c => c.CommunityPlaylists.OrderByDescending(cp => cp.AddedAt))
                .ThenInclude(cp => cp.Playlist)
                    .ThenInclude(p => p.PlaylistSongs)
            .Include(c => c.CommunitySongs.OrderByDescending(cs => cs.AddedAt))
                .ThenInclude(cs => cs.Song)
            .Include(c => c.Comments.OrderByDescending(cc => cc.CreatedAt))
            .FirstOrDefaultAsync(c => c.Id == communityId, ct);

    public Task<Community?> GetByIdAsync(Guid communityId, bool track = true, CancellationToken ct = default)
    {
        IQueryable<Community> query = track ? _db.Communities : _db.Communities.AsNoTracking();
        return query.FirstOrDefaultAsync(c => c.Id == communityId, ct);
    }

    public Task<bool> ExistsAsync(Guid communityId, CancellationToken ct = default) =>
        _db.Communities.AnyAsync(c => c.Id == communityId, ct);

    public Task<bool> NormalizedNameExistsAsync(string normalizedName, Guid? excludeCommunityId = null, CancellationToken ct = default)
    {
        IQueryable<Community> query = _db.Communities.Where(c => c.NormalizedName == normalizedName);
        if (excludeCommunityId.HasValue)
        {
            query = query.Where(c => c.Id != excludeCommunityId.Value);
        }

        return query.AnyAsync(ct);
    }

    public Task<User?> FindUserAsync(Guid userId, CancellationToken ct = default) =>
        _db.Users.AsNoTracking().FirstOrDefaultAsync(u => u.Id == userId, ct);

    public Task<Playlist?> FindPlaylistWithSongsAsync(Guid playlistId, CancellationToken ct = default) =>
        _db.Playlists.AsNoTracking().Include(p => p.PlaylistSongs).FirstOrDefaultAsync(p => p.Id == playlistId, ct);

    public Task<Song?> FindSongAsync(Guid songId, CancellationToken ct = default) =>
        _db.Songs.AsNoTracking().FirstOrDefaultAsync(s => s.Id == songId, ct);

    public async Task CreateWithFounderAsync(Community community, CommunityMember founder, CancellationToken ct = default)
    {
        await using var tx = await _db.Database.BeginTransactionAsync(ct);
        _db.Communities.Add(community);
        _db.CommunityMembers.Add(founder);
        await _db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
    }

    public async Task RemoveAsync(Community community, CancellationToken ct = default)
    {
        _db.Communities.Remove(community);
        await _db.SaveChangesAsync(ct);
    }

    public Task<bool> IsMemberAsync(Guid communityId, Guid userId, CancellationToken ct = default) =>
        _db.CommunityMembers.AnyAsync(m => m.CommunityId == communityId && m.UserId == userId, ct);

    public Task<CommunityMember?> GetMemberAsync(Guid communityId, Guid userId, CancellationToken ct = default) =>
        _db.CommunityMembers.FirstOrDefaultAsync(m => m.CommunityId == communityId && m.UserId == userId, ct);

    public async Task AddMemberAsync(CommunityMember member, CancellationToken ct = default)
    {
        _db.CommunityMembers.Add(member);
        await _db.SaveChangesAsync(ct);
    }

    public async Task RemoveMemberAsync(CommunityMember member, CancellationToken ct = default)
    {
        _db.CommunityMembers.Remove(member);
        await _db.SaveChangesAsync(ct);
    }

    public Task<bool> IsPlaylistLinkedAsync(Guid communityId, Guid playlistId, CancellationToken ct = default) =>
        _db.CommunityPlaylists.AnyAsync(cp => cp.CommunityId == communityId && cp.PlaylistId == playlistId, ct);

    public Task<CommunityPlaylist?> GetCommunityPlaylistAsync(Guid communityId, Guid playlistId, CancellationToken ct = default) =>
        _db.CommunityPlaylists.FirstOrDefaultAsync(cp => cp.CommunityId == communityId && cp.PlaylistId == playlistId, ct);

    public async Task AddCommunityPlaylistAsync(CommunityPlaylist link, Community community, CancellationToken ct = default)
    {
        _db.CommunityPlaylists.Add(link);
        community.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task RemoveCommunityPlaylistAsync(CommunityPlaylist link, Community community, CancellationToken ct = default)
    {
        _db.CommunityPlaylists.Remove(link);
        community.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public Task<bool> IsSongLinkedAsync(Guid communityId, Guid songId, CancellationToken ct = default) =>
        _db.CommunitySongs.AnyAsync(cs => cs.CommunityId == communityId && cs.SongId == songId, ct);

    public Task<CommunitySong?> GetCommunitySongAsync(Guid communityId, Guid songId, CancellationToken ct = default) =>
        _db.CommunitySongs.FirstOrDefaultAsync(cs => cs.CommunityId == communityId && cs.SongId == songId, ct);

    public async Task AddCommunitySongAsync(CommunitySong link, Community community, CancellationToken ct = default)
    {
        _db.CommunitySongs.Add(link);
        community.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public async Task RemoveCommunitySongAsync(CommunitySong link, Community community, CancellationToken ct = default)
    {
        _db.CommunitySongs.Remove(link);
        community.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);
    }

    public Task<List<CommunityComment>> GetCommentsAsync(Guid communityId, CancellationToken ct = default) =>
        _db.CommunityComments
            .AsNoTracking()
            .Where(cc => cc.CommunityId == communityId)
            .OrderByDescending(cc => cc.CreatedAt)
            .ToListAsync(ct);

    public Task<CommunityComment?> GetCommentAsync(Guid communityId, Guid commentId, CancellationToken ct = default) =>
        _db.CommunityComments.FirstOrDefaultAsync(cc => cc.Id == commentId && cc.CommunityId == communityId, ct);

    public async Task AddCommentAsync(CommunityComment comment, CancellationToken ct = default)
    {
        _db.CommunityComments.Add(comment);
        await _db.SaveChangesAsync(ct);
    }

    public async Task RemoveCommentAsync(CommunityComment comment, CancellationToken ct = default)
    {
        _db.CommunityComments.Remove(comment);
        await _db.SaveChangesAsync(ct);
    }

    public Task<int> SaveChangesAsync(CancellationToken ct = default) => _db.SaveChangesAsync(ct);
}
