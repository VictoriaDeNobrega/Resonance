using Microsoft.EntityFrameworkCore;
using Resonance.Api.Models;

namespace Resonance.Api.Data;

public class SongRepository
{
    private readonly AppDbContext _db;

    public SongRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<List<Song>> GetAllWithDetailsAsync(string? server = null, CancellationToken ct = default)
    {
        IQueryable<Song> query = _db.Songs
            .AsNoTracking()
            .AsSplitQuery()
            .Include(s => s.Reviews)
            .Include(s => s.FavoritedByUsers);

        query = ApplyServerFilter(query, server);
        var list = await query.ToListAsync(ct);
        return IsAllServers(server) ? DeduplicateTracks(list) : list;
    }

    public async Task<(List<Song> Items, int TotalCount)> SearchPagedAsync(
        string? query,
        string? genre,
        string? artist,
        string? server,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var safePage = Math.Max(1, page);
        var safePageSize = Math.Clamp(pageSize, 1, 2000);

        IQueryable<Song> songQuery = _db.Songs
            .AsNoTracking()
            .AsSplitQuery()
            .Include(s => s.Reviews)
            .Include(s => s.FavoritedByUsers);

        songQuery = ApplyServerFilter(songQuery, server);

        if (!string.IsNullOrWhiteSpace(query))
        {
            var prefix = $"{query.Trim()}%";
            songQuery = songQuery.Where(s =>
                EF.Functions.ILike(s.Title, prefix) ||
                EF.Functions.ILike(s.Artist, prefix) ||
                EF.Functions.ILike(s.Album, prefix) ||
                EF.Functions.ILike(s.Genre, prefix));
        }

        if (!string.IsNullOrWhiteSpace(genre))
        {
            var genrePrefix = $"{genre.Trim()}%";
            songQuery = songQuery.Where(s => EF.Functions.ILike(s.Genre, genrePrefix));
        }

        if (!string.IsNullOrWhiteSpace(artist))
        {
            var artistPrefix = $"{artist.Trim()}%";
            songQuery = songQuery.Where(s => EF.Functions.ILike(s.Artist, artistPrefix));
        }

        if (IsAllServers(server))
        {
            var allMatches = DeduplicateTracks(await songQuery.ToListAsync(ct))
                .OrderByDescending(s => s.PlayCount)
                .ThenBy(s => s.Title)
                .ToList();
            var items = allMatches.Skip((safePage - 1) * safePageSize).Take(safePageSize).ToList();
            return (items, allMatches.Count);
        }

        var totalCount = await songQuery.CountAsync(ct);
        var pagedItems = await songQuery
            .OrderByDescending(s => s.PlayCount)
            .ThenBy(s => s.Title)
            .Skip((safePage - 1) * safePageSize)
            .Take(safePageSize)
            .ToListAsync(ct);

        return (pagedItems, totalCount);
    }

    public Task<Song?> GetByIdWithFullDetailsAsync(Guid songId, CancellationToken ct = default) =>
        _db.Songs
            .AsNoTracking()
            .AsSplitQuery()
            .Include(s => s.Reviews.OrderByDescending(r => r.CreatedAt))
            .Include(s => s.FavoritedByUsers)
            .Include(s => s.PlaylistSongs)
            .Include(s => s.CommunitySongs)
            .FirstOrDefaultAsync(s => s.Id == songId, ct);

    public Task<Song?> GetByIdForUpdateAsync(Guid songId, bool includeRelations = true, CancellationToken ct = default)
    {
        IQueryable<Song> query = _db.Songs;
        if (includeRelations)
            query = query.Include(s => s.Reviews).Include(s => s.FavoritedByUsers);
        return query.FirstOrDefaultAsync(s => s.Id == songId, ct);
    }

    public Task<bool> ExistsAsync(Guid songId, CancellationToken ct = default) =>
        _db.Songs.AnyAsync(s => s.Id == songId, ct);

    public Task<bool> UserExistsAsync(Guid userId, CancellationToken ct = default) =>
        _db.Users.AnyAsync(u => u.Id == userId, ct);

    public Task<User?> FindUserAsync(Guid userId, bool track = false, CancellationToken ct = default)
    {
        IQueryable<User> query = track ? _db.Users : _db.Users.AsNoTracking();
        return query.FirstOrDefaultAsync(u => u.Id == userId, ct);
    }

    public async Task AddAsync(Song song, CancellationToken ct = default)
    {
        _db.Songs.Add(song);
        await _db.SaveChangesAsync(ct);
    }

    public async Task RemoveAsync(Song song, CancellationToken ct = default)
    {
        _db.Songs.Remove(song);
        await _db.SaveChangesAsync(ct);
    }

    public async Task<(bool IsFavorite, int FavoriteCount)> ToggleFavoriteAsync(Guid songId, Guid userId, CancellationToken ct = default)
    {
        var existing = await _db.UserFavoriteSongs
            .FirstOrDefaultAsync(f => f.SongId == songId && f.UserId == userId, ct);

        bool isFavorite;
        if (existing is not null)
        {
            _db.UserFavoriteSongs.Remove(existing);
            isFavorite = false;
        }
        else
        {
            _db.UserFavoriteSongs.Add(new UserFavoriteSong
            {
                Id = Guid.NewGuid(),
                SongId = songId,
                UserId = userId,
                CreatedAt = DateTime.UtcNow
            });
            isFavorite = true;
        }

        await _db.SaveChangesAsync(ct);
        var favoriteCount = await _db.UserFavoriteSongs.CountAsync(f => f.SongId == songId, ct);
        return (isFavorite, favoriteCount);
    }

    public Task<List<Song>> GetUserFavoritesAsync(Guid userId, CancellationToken ct = default) =>
        _db.Songs
            .AsNoTracking()
            .AsSplitQuery()
            .Include(s => s.Reviews)
            .Include(s => s.FavoritedByUsers)
            .Where(s => s.FavoritedByUsers.Any(f => f.UserId == userId))
            .OrderBy(s => s.Title)
            .ToListAsync(ct);

    public Task<List<Review>> GetReviewsAsync(Guid songId, CancellationToken ct = default) =>
        _db.Reviews
            .AsNoTracking()
            .Where(r => r.SongId == songId)
            .OrderByDescending(r => r.CreatedAt)
            .ToListAsync(ct);

    public async Task AddReviewAsync(Review review, CancellationToken ct = default)
    {
        _db.Reviews.Add(review);
        await _db.SaveChangesAsync(ct);
    }

    public Task<int> SaveChangesAsync(CancellationToken ct = default) => _db.SaveChangesAsync(ct);

    private static bool IsAllServers(string? server) =>
        string.IsNullOrWhiteSpace(server) ||
        server.Trim().Equals("all", StringComparison.OrdinalIgnoreCase) ||
        server.Trim().Equals("todos", StringComparison.OrdinalIgnoreCase);

    private static List<Song> DeduplicateTracks(List<Song> songs) =>
        songs
            .OrderBy(s => s.SourceServer == "movil" ? 0 : 1)
            .DistinctBy(s => !string.IsNullOrWhiteSpace(s.ExternalId)
                ? s.ExternalId
                : $"{s.Title?.Trim()}|{s.Artist?.Trim()}".ToLowerInvariant())
            .ToList();

    private static IQueryable<Song> ApplyServerFilter(IQueryable<Song> query, string? server)
    {
        if (IsAllServers(server)) return query;
        var norm = server!.Trim().ToLowerInvariant();
        var mapped = norm switch
        {
            "primary" or "movil" or "server1" or "1" => "movil",
            "secondary" or "musica" or "server2" or "2" => "musica",
            _ => norm
        };
        return query.Where(s => s.SourceServer == mapped);
    }
}
