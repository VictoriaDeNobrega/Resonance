using Microsoft.EntityFrameworkCore;
using Resonance.Api.DTOs;
using Resonance.Api.Models;

namespace Resonance.Api.Data;

public class SubsonicCatalogRepository
{
    private readonly AppDbContext _db;

    public SubsonicCatalogRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<(int SyncedCount, int TotalCount)> GetCatalogCountsAsync(CancellationToken ct = default)
    {
        var syncedCount = await _db.Songs.CountAsync(s => s.ExternalId != null, ct);
        var totalCount = await _db.Songs.CountAsync(ct);
        return (syncedCount, totalCount);
    }

    public Task<int> CountAsync(CancellationToken ct = default) => _db.Songs.CountAsync(ct);

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
                        existing.Description = track.Description;
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
