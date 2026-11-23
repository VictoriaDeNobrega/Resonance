using Microsoft.EntityFrameworkCore;
using Resonance.Api.DTOs;
using Resonance.Api.Models;

namespace Resonance.Api.Data;

public class SongRepository
{
    private readonly AppDbContext _db;

    public SongRepository(AppDbContext db)
    {
        _db = db;
    }

    public Task<List<Song>> GetAllWithDetailsAsync(string? server = null, CancellationToken ct = default)
    {
        IQueryable<Song> query = _db.Songs
            .AsNoTracking()
            .Include(s => s.Reviews)
            .Include(s => s.FavoritedByUsers);

        query = ApplyServerFilter(query, server);
        return query.ToListAsync(ct);
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

        var totalCount = await songQuery.CountAsync(ct);
        var items = await songQuery
            .OrderByDescending(s => s.PlayCount)
            .ThenBy(s => s.Title)
            .Skip((safePage - 1) * safePageSize)
            .Take(safePageSize)
            .ToListAsync(ct);

        return (items, totalCount);
    }

    public Task<Song?> GetByIdWithFullDetailsAsync(Guid songId, CancellationToken ct = default) =>
        _db.Songs
            .AsNoTracking()
            .Include(s => s.Reviews.OrderByDescending(r => r.CreatedAt))
            .Include(s => s.FavoritedByUsers)
            .Include(s => s.PlaylistSongs)
            .Include(s => s.CommunitySongs)
            .FirstOrDefaultAsync(s => s.Id == songId, ct);

    public Task<Song?> GetByIdForUpdateAsync(Guid songId, bool includeRelations = true, CancellationToken ct = default)
    {
        IQueryable<Song> query = _db.Songs;
        if (includeRelations)
        {
            query = query.Include(s => s.Reviews).Include(s => s.FavoritedByUsers);
        }

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
        _db.UserFavoriteSongs
            .AsNoTracking()
            .Where(f => f.UserId == userId)
            .OrderByDescending(f => f.CreatedAt)
            .Include(f => f.Song).ThenInclude(s => s.Reviews)
            .Include(f => f.Song).ThenInclude(s => s.FavoritedByUsers)
            .Select(f => f.Song)
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

    public async Task<(int SyncedCount, int TotalCount)> GetCatalogCountsAsync(CancellationToken ct = default)
    {
        var syncedCount = await _db.Songs.CountAsync(s => s.ExternalId != null, ct);
        var totalCount = await _db.Songs.CountAsync(ct);
        return (syncedCount, totalCount);
    }

    public Task<int> CountAsync(CancellationToken ct = default) => _db.Songs.CountAsync(ct);

    public Task<int> SaveChangesAsync(CancellationToken ct = default) => _db.SaveChangesAsync(ct);

    private static IQueryable<Song> ApplyServerFilter(IQueryable<Song> query, string? server)
    {
        if (string.IsNullOrWhiteSpace(server)) return query;
        var norm = server.Trim().ToLowerInvariant();
        if (norm is "all" or "todos") return query;

        var mapped = norm switch
        {
            "primary" or "movil" or "server1" or "1" => "movil",
            "secondary" or "musica" or "server2" or "2" => "musica",
            _ => norm
        };

        return query.Where(s => s.SourceServer == mapped);
    }

    public async Task<(int AddedCount, int UpdatedCount, int TotalCount)> UpsertSubsonicCatalogAsync(
        List<SubsonicTrackDto> tracks,
        string defaultUploaderName,
        CancellationToken ct = default)
    {
        var addedCount = 0;
        var updatedCount = 0;

        if (tracks.Count > 0)
        {
            var nidusUser = await _db.Users.AsNoTracking()
                .FirstOrDefaultAsync(u => u.Name == defaultUploaderName || u.Email == "nidus@resonance.pp.ua", ct);

            var externalIds = tracks.Select(t => t.ExternalId).Distinct().ToList();
            var existingSongs = await _db.Songs
                .Where(s => s.ExternalId != null && externalIds.Contains(s.ExternalId))
                .ToListAsync(ct);
            var existingByKey = existingSongs.ToDictionary(s => (s.ExternalId!, s.SourceServer));

            await using var tx = await _db.Database.BeginTransactionAsync(ct);

            foreach (var track in tracks)
            {
                var key = (track.ExternalId, track.SourceServer);
                if (existingByKey.TryGetValue(key, out var existing))
                {
                    existing.Title = track.Title;
                    existing.Artist = track.Artist;
                    existing.Album = track.Album;
                    existing.Genre = track.Genre;
                    existing.DurationInSeconds = track.DurationInSeconds;
                    existing.AudioUrl = track.AudioUrl;
                    existing.CoverImageUrl = track.CoverImageUrl;
                    if (string.IsNullOrWhiteSpace(existing.Description))
                    {
                        existing.Description = track.Description;
                    }
                    updatedCount++;
                }
                else
                {
                    var newSong = new Song
                    {
                        Id = Guid.NewGuid(),
                        ExternalId = track.ExternalId,
                        SourceServer = track.SourceServer,
                        Title = track.Title,
                        Artist = track.Artist,
                        Album = track.Album,
                        Genre = track.Genre,
                        DurationInSeconds = track.DurationInSeconds,
                        AudioUrl = track.AudioUrl,
                        CoverImageUrl = track.CoverImageUrl,
                        Description = track.Description,
                        PlayCount = track.InitialPlayCount,
                        UploadedById = nidusUser?.Id,
                        UploadedByName = nidusUser?.Name ?? defaultUploaderName,
                        CreatedAt = DateTime.UtcNow
                    };
                    _db.Songs.Add(newSong);
                    existingByKey[key] = newSong;
                    addedCount++;
                }
            }

            await _db.SaveChangesAsync(ct);
            await tx.CommitAsync(ct);
        }

        var totalCatalog = await _db.Songs.CountAsync(ct);
        return (addedCount, updatedCount, totalCatalog);
    }
}
