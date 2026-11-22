using System.Data;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Resonance.Api.Models;
using Resonance.Api.Services;

namespace Resonance.Api.Data;

public static class DbInitializer
{
    public static async Task InitializeAsync(IServiceProvider serviceProvider, CancellationToken ct = default)
    {
        using var scope = serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        var navidromeService = scope.ServiceProvider.GetRequiredService<INavidromeService>();
        var logger = scope.ServiceProvider.GetRequiredService<ILoggerFactory>().CreateLogger("DbInitializer");

        await EnsureCompleteSchemaAsync(db, logger, ct);

        var users = await SeedUsersAsync(db, ct);
        var nidus = users[0];

        var syncResult = await navidromeService.SyncWithMusicServerAsync("primary", ct);
        logger.LogInformation("[DbInitializer] Sync Subsonic: {Message}", syncResult.Message);

        await EnsureFallbackCatalogAsync(db, navidromeService, nidus, ct);

        var allSongs = await db.Songs.OrderBy(s => s.Title).ToListAsync(ct);
        if (allSongs.Count == 0)
        {
            return;
        }

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        if (!await db.UserFavoriteSongs.AnyAsync(ct))
        {
            db.UserFavoriteSongs.AddRange(SeedDataCatalog.BuildFavorites(users, allSongs));
        }

        if (!await db.Reviews.AnyAsync(ct))
        {
            db.Reviews.AddRange(SeedDataCatalog.BuildReviews(users, allSongs));
        }

        var playlists = await db.Playlists.Include(p => p.PlaylistSongs).ToListAsync(ct);
        if (playlists.Count < 4)
        {
            var (seededPlaylists, playlistTracks) = SeedDataCatalog.BuildPlaylistsGraph(users, allSongs);
            db.Playlists.AddRange(seededPlaylists);
            db.PlaylistSongs.AddRange(playlistTracks);
            playlists = seededPlaylists;
        }

        if (!await db.Communities.AnyAsync(ct))
        {
            var (communities, members, linkedPlaylists, linkedSongs, comments) =
                SeedDataCatalog.BuildCommunitiesGraph(users, allSongs, playlists);
            db.Communities.AddRange(communities);
            db.CommunityMembers.AddRange(members);
            db.CommunityPlaylists.AddRange(linkedPlaylists);
            db.CommunitySongs.AddRange(linkedSongs);
            db.CommunityComments.AddRange(comments);
        }

        if (!await db.Rooms.AnyAsync(ct))
        {
            var (rooms, queue, messages) = SeedDataCatalog.BuildRoomsGraph(users, allSongs);
            db.Rooms.AddRange(rooms);
            db.RoomSongs.AddRange(queue);
            db.RoomMessages.AddRange(messages);
        }

        if (nidus.LastPlayedSongId is null)
        {
            nidus.LastPlayedSongId = allSongs[0].Id;
            nidus.LastPlaybackPositionMs = 42000;
            nidus.ActiveView = "discover";
        }

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);

        logger.LogInformation(
            "[DbInitializer] PostgreSQL 16 listo: {Users} usuarios, {Songs} canciones, {Playlists} playlists, {Communities} comunidades, {Rooms} salas.",
            await db.Users.CountAsync(ct),
            await db.Songs.CountAsync(ct),
            await db.Playlists.CountAsync(ct),
            await db.Communities.CountAsync(ct),
            await db.Rooms.CountAsync(ct));
    }

    private static async Task EnsureCompleteSchemaAsync(AppDbContext db, ILogger logger, CancellationToken ct)
    {
        if (await db.Database.EnsureCreatedAsync(ct))
        {
            logger.LogInformation("[DbInitializer] Esquema completo de 14 tablas creado desde cero en PostgreSQL 16.");
            return;
        }

        var existingTables = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var hasRequiredColumns = false;
        var conn = db.Database.GetDbConnection();
        var shouldClose = conn.State != ConnectionState.Open;
        if (shouldClose) await conn.OpenAsync(ct);

        try
        {
            await using (var cmd = conn.CreateCommand())
            {
                cmd.CommandText = "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';";
                await using var reader = await cmd.ExecuteReaderAsync(ct);
                while (await reader.ReadAsync(ct)) existingTables.Add(reader.GetString(0));
            }

            if (SeedDataCatalog.RequiredTables.All(t => existingTables.Contains(t)))
            {
                await using var colCmd = conn.CreateCommand();
                colCmd.CommandText = """
                    SELECT COUNT(*) FROM information_schema.columns
                    WHERE table_schema = 'public' AND (
                        (table_name = 'Songs' AND column_name = 'ExternalId') OR
                        (table_name = 'Users' AND column_name = 'ActiveRoomCode') OR
                        (table_name = 'Rooms' AND column_name = 'AccessKey') OR
                        (table_name = 'Rooms' AND column_name = 'SkipVoterIdsJson')
                    );
                    """;
                hasRequiredColumns = Convert.ToInt32(await colCmd.ExecuteScalarAsync(ct)) == 4;
            }
        }
        finally
        {
            if (shouldClose) await conn.CloseAsync();
        }

        if (!SeedDataCatalog.RequiredTables.All(t => existingTables.Contains(t)) || !hasRequiredColumns)
        {
            logger.LogWarning("[DbInitializer] Esquema incompleto ({Count} tablas). Recreando esquema v2 de 14 tablas.", existingTables.Count);
            await db.Database.ExecuteSqlRawAsync("DROP SCHEMA public CASCADE; CREATE SCHEMA public;", ct);
            await db.Database.EnsureCreatedAsync(ct);
        }
    }

    private static async Task<List<User>> SeedUsersAsync(AppDbContext db, CancellationToken ct)
    {
        var existing = await db.Users.OrderBy(u => u.CreatedAt).ToListAsync(ct);
        if (existing.Count >= SeedDataCatalog.InitialUserSpecs.Length)
        {
            return existing;
        }

        var hasher = new PasswordHasher<User>();
        var result = new List<User>();
        for (var i = 0; i < SeedDataCatalog.InitialUserSpecs.Length; i++)
        {
            var spec = SeedDataCatalog.InitialUserSpecs[i];
            var found = existing.FirstOrDefault(u => u.Email.Equals(spec.Email, StringComparison.OrdinalIgnoreCase));
            if (found is not null)
            {
                result.Add(found);
                continue;
            }

            var user = SeedDataCatalog.BuildUser(spec, i, hasher);
            db.Users.Add(user);
            result.Add(user);
        }

        await db.SaveChangesAsync(ct);
        return result;
    }

    private static async Task EnsureFallbackCatalogAsync(
        AppDbContext db,
        INavidromeService navidromeService,
        User nidus,
        CancellationToken ct)
    {
        var existingIds = (await db.Songs.Where(s => s.ExternalId != null).Select(s => s.ExternalId!).ToListAsync(ct))
            .ToHashSet(StringComparer.Ordinal);

        var missing = SeedDataCatalog.BuildMissingCalvaLouiseSongs(
            existingIds,
            navidromeService.PrimaryUrl,
            navidromeService.BuildAuthQuery(includeJsonFormat: false),
            nidus);

        if (missing.Count > 0)
        {
            db.Songs.AddRange(missing);
            await db.SaveChangesAsync(ct);
        }
    }
}
