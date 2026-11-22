using Microsoft.AspNetCore.Identity;
using Resonance.Api.Models;

namespace Resonance.Api.Data;

public static class SeedDataCatalog
{
    public static readonly string[] RequiredTables =
    {
        "Users", "Songs", "UserFavoriteSongs", "Reviews",
        "Playlists", "PlaylistSongs", "Communities", "CommunityMembers",
        "CommunityPlaylists", "CommunitySongs", "CommunityComments",
        "Rooms", "RoomSongs", "RoomMessages"
    };

    public static readonly (string Name, string Email, string Password, string Bio)[] InitialUserSpecs =
    {
        ("Nidus", "nidus@resonance.pp.ua", "115r935m", "Curador principal del servidor musical Resonance (Subsonic / Navidrome)."),
        ("Sebastián Pérez", "sebastian@resonance.app", "Resonance123!", "Anfitrión de salas Jam sincronizadas y fan del rock alternativo."),
        ("Victoria De Nóbrega", "victoria@resonance.app", "Resonance123!", "Coleccionista de playlists colaborativas y comunidades musicales."),
        ("Gabriel Castro", "gabriel@resonance.app", "Resonance123!", "Explorador de catálogo Hi-Fi y reseñas de álbumes."),
        ("Luis Guerrero", "luis@resonance.app", "Resonance123!", "Melómano nocturno y diseñador de sesiones en vivo."),
        ("Jesús Medina", "jesus@resonance.app", "Resonance123!", "Moderador de comunidades temáticas y curador de synth-rock.")
    };

    public static readonly (string ExtId, string Title, string Genre, int Duration, string CoverId, int Plays)[] CalvaLouiseTracks =
    {
        ("5PNACUWLbRqqJRvsEPKH06", "Impeccable", "Electronic Rock", 282, "mf-5PNACUWLbRqqJRvsEPKH06", 142),
        ("2ZrGmlTlIHVRfoQStMiQgC", "The Abyss", "Electronic Rock", 158, "mf-2ZrGmlTlIHVRfoQStMiQgC_3d3f027cc830c0e9", 128),
        ("558KFuy91voD4d6QdhdAPo", "Tunnel Vision", "Electronic Rock", 175, "mf-558KFuy91voD4d6QdhdAPo_3d3f027cc830c0e9", 119),
        ("0eyKfRlgOfZwyzKRf9P3Hh", "W.T.F", "Alternative Rock", 207, "mf-0eyKfRlgOfZwyzKRf9P3Hh_3d3f027cc830c0e9", 110),
        ("2Wl2YJBIJVvYdgyzYdQSKo", "La Corriente", "Rock en Español", 240, "mf-2Wl2YJBIJVvYdgyzYdQSKo", 136),
        ("37liVSHZEb74WSGjc8PQyz", "El Umbral", "Rock en Español", 252, "mf-37liVSHZEb74WSGjc8PQyz_3d3f027cc830c0e9", 104),
        ("7DIEj3KjaZFjDe0M3awGYS", "Lo Que Vale", "Rock en Español", 203, "mf-7DIEj3KjaZFjDe0M3awGYS", 98),
        ("5c3bSsNNQxRodbUZTKn0Wx", "Barely A Response", "Alternative Rock", 224, "mf-5c3bSsNNQxRodbUZTKn0Wx", 91),
        ("27X3CEvyil8OU9SMt82Kh3", "Under The Skin", "Alternative Rock", 251, "mf-27X3CEvyil8OU9SMt82Kh3", 87),
        ("1nV2TpoZsfkDDRcUL3ajbK", "Aimless", "Alternative Rock", 217, "mf-1nV2TpoZsfkDDRcUL3ajbK_3d3f027cc830c0e9", 83),
        ("0QEKqVSo0wzHucqTpuZKIQ", "Hate in me", "Alternative Rock", 207, "mf-0QEKqVSo0wzHucqTpuZKIQ_3d3f027cc830c0e9", 79)
    };

    public static User BuildUser((string Name, string Email, string Password, string Bio) spec, int index, PasswordHasher<User> hasher)
    {
        var user = new User
        {
            Id = Guid.NewGuid(),
            Name = spec.Name,
            Email = spec.Email,
            AvatarUrl = $"https://api.dicebear.com/9.x/thumbs/svg?seed={Uri.EscapeDataString(spec.Name)}",
            Bio = spec.Bio,
            IsConfirmed = true,
            ConfirmationToken = null,
            PreferredVolume = 0.8,
            ActiveView = "discover",
            CreatedAt = DateTime.UtcNow.AddDays(-10).AddHours(index)
        };
        user.PasswordHash = hasher.HashPassword(user, spec.Password);
        return user;
    }

    public static List<Song> BuildMissingCalvaLouiseSongs(
        HashSet<string> existingExternalIds,
        string primaryUrl,
        string authQuery,
        User nidus)
    {
        return CalvaLouiseTracks
            .Where(t => !existingExternalIds.Contains(t.ExtId))
            .Select(t => new Song
            {
                Id = Guid.NewGuid(),
                ExternalId = t.ExtId,
                Title = t.Title,
                Artist = "Calva Louise",
                Album = "Edge of the Abyss",
                Genre = t.Genre,
                DurationInSeconds = t.Duration,
                AudioUrl = $"{primaryUrl}/rest/stream.view?id={t.ExtId}&{authQuery}",
                CoverImageUrl = $"{primaryUrl}/rest/getCoverArt.view?id={t.CoverId}&size=600&{authQuery}",
                Description = $"Calva Louise — Edge of the Abyss (Stream oficial en {primaryUrl}).",
                PlayCount = t.Plays,
                UploadedById = nidus.Id,
                UploadedByName = nidus.Name,
                CreatedAt = DateTime.UtcNow
            })
            .ToList();
    }

    public static List<UserFavoriteSong> BuildFavorites(List<User> users, List<Song> songs)
    {
        var favs = new List<UserFavoriteSong>
        {
            new() { UserId = users[0].Id, SongId = songs[0].Id },
            new() { UserId = users[0].Id, SongId = songs[Math.Min(1, songs.Count - 1)].Id },
            new() { UserId = users[1].Id, SongId = songs[0].Id },
            new() { UserId = users[2].Id, SongId = songs[Math.Min(2, songs.Count - 1)].Id },
            new() { UserId = users[3].Id, SongId = songs[Math.Min(3, songs.Count - 1)].Id }
        };
        return favs.DistinctBy(f => (f.UserId, f.SongId)).ToList();
    }

    public static List<Review> BuildReviews(List<User> users, List<Song> songs) => new()
    {
        new() { SongId = songs[0].Id, UserId = users[1].Id, UserName = users[1].Name, Rating = 5, Content = "Producción brutal y riffs electrónicos impecables para escuchar en sala sincronizada.", CreatedAt = DateTime.UtcNow.AddDays(-2) },
        new() { SongId = songs[0].Id, UserId = users[3].Id, UserName = users[3].Name, Rating = 5, Content = "Sonido súper limpio desde el servidor Navidrome de Resonance.", CreatedAt = DateTime.UtcNow.AddDays(-1) },
        new() { SongId = songs[Math.Min(1, songs.Count - 1)].Id, UserId = users[2].Id, UserName = users[2].Name, Rating = 4, Content = "Excelente dinámica bilingüe y energía de principio a fin.", CreatedAt = DateTime.UtcNow.AddHours(-12) }
    };

    public static (List<Playlist> Playlists, List<PlaylistSong> Tracks) BuildPlaylistsGraph(List<User> users, List<Song> songs)
    {
        var playlists = new List<Playlist>
        {
            new() { Id = Guid.NewGuid(), UserId = users[0].Id, AuthorName = users[0].Name, Name = "Edge of the Abyss — Sesión Completa", Description = "Recorrido completo de estudio sincronizado desde musica.res0nance.pp.ua.", CoverImageUrl = songs[0].CoverImageUrl, IsPublic = true },
            new() { Id = Guid.NewGuid(), UserId = users[1].Id, AuthorName = users[1].Name, Name = "Jam Nocturno UCAB", Description = "Selección energética de Electronic Rock y Alternative Rock para salas en vivo.", CoverImageUrl = songs[Math.Min(1, songs.Count - 1)].CoverImageUrl, IsPublic = true },
            new() { Id = Guid.NewGuid(), UserId = users[2].Id, AuthorName = users[2].Name, Name = "Frecuencia en Español", Description = "Pistas en español de alto impacto: La Corriente, El Umbral y Lo Que Vale.", CoverImageUrl = songs[Math.Min(2, songs.Count - 1)].CoverImageUrl, IsPublic = true },
            new() { Id = Guid.NewGuid(), UserId = users[3].Id, AuthorName = users[3].Name, Name = "Laboratorio Privado Hi-Fi", Description = "Lista personal de pruebas acústicas y mezcla.", CoverImageUrl = songs[Math.Min(3, songs.Count - 1)].CoverImageUrl, IsPublic = false }
        };

        var selections = new[]
        {
            songs.Take(6).ToList(),
            songs.Where(s => s.Genre.Contains("Electronic", StringComparison.OrdinalIgnoreCase) || s.Genre.Contains("Alternative", StringComparison.OrdinalIgnoreCase)).Take(5).ToList(),
            songs.Where(s => s.Genre.Contains("Español", StringComparison.OrdinalIgnoreCase)).Concat(songs).DistinctBy(s => s.Id).Take(4).ToList(),
            songs.Skip(Math.Max(0, songs.Count - 4)).Take(4).ToList()
        };

        var tracks = new List<PlaylistSong>();
        for (var p = 0; p < playlists.Count; p++)
        {
            for (var s = 0; s < selections[p].Count; s++)
            {
                tracks.Add(new PlaylistSong
                {
                    Id = Guid.NewGuid(),
                    PlaylistId = playlists[p].Id,
                    SongId = selections[p][s].Id,
                    OrderIndex = s,
                    AddedAt = DateTime.UtcNow.AddMinutes(-30 + s)
                });
            }
        }

        return (playlists, tracks);
    }

    public static (List<Community> Communities, List<CommunityMember> Members, List<CommunityPlaylist> Playlists, List<CommunitySong> Songs, List<CommunityComment> Comments)
        BuildCommunitiesGraph(List<User> users, List<Song> songs, List<Playlist> playlists)
    {
        var defs = new (string Name, string Desc, CommunityCategoryType Type, string Value, User Creator, Playlist LinkedPlaylist, Song FeaturedSong)[]
        {
            ("Alternative Rock Lab", "Comunidad dedicada al rock alternativo, riffs pesados y lanzamientos modernos.", CommunityCategoryType.Genre, "Alternative Rock", users[0], playlists[0], songs[0]),
            ("Calva Louise Collective", "Club oficial de oyentes de Edge of the Abyss con playlists y debates en vivo.", CommunityCategoryType.Artist, "Calva Louise", users[1], playlists[1], songs[Math.Min(1, songs.Count - 1)]),
            ("Rock en Español Vivo", "Espacio para bandas latinoamericanas y rock alternativo en español.", CommunityCategoryType.Genre, "Rock en Español", users[2], playlists[2], songs[Math.Min(2, songs.Count - 1)]),
            ("Electronic Rock & Synth", "Fusión de sintetizadores, rock industrial y sesiones nocturnas de alta energía.", CommunityCategoryType.Genre, "Electronic Rock", users[5], playlists[0], songs[Math.Min(3, songs.Count - 1)])
        };

        var communities = new List<Community>();
        var members = new List<CommunityMember>();
        var linkedPlaylists = new List<CommunityPlaylist>();
        var linkedSongs = new List<CommunitySong>();
        var comments = new List<CommunityComment>();

        foreach (var def in defs)
        {
            var community = new Community
            {
                Id = Guid.NewGuid(), Name = def.Name, NormalizedName = Community.Normalize(def.Name),
                Description = def.Desc, CategoryType = def.Type, CategoryValue = def.Value,
                CoverImageUrl = def.FeaturedSong.CoverImageUrl, CreatorId = def.Creator.Id,
                CreatorName = def.Creator.Name, CreatedAt = DateTime.UtcNow.AddDays(-5), UpdatedAt = DateTime.UtcNow
            };
            communities.Add(community);

            foreach (var m in new[] { def.Creator, users[3], users[4] }.DistinctBy(u => u.Id))
            {
                members.Add(new CommunityMember { Id = Guid.NewGuid(), CommunityId = community.Id, UserId = m.Id, UserName = m.Name, JoinedAt = DateTime.UtcNow.AddDays(-3) });
            }

            linkedPlaylists.Add(new CommunityPlaylist { Id = Guid.NewGuid(), CommunityId = community.Id, PlaylistId = def.LinkedPlaylist.Id, PlaylistTitle = def.LinkedPlaylist.Name, AddedByUserId = def.Creator.Id, AddedAt = DateTime.UtcNow.AddDays(-2) });
            linkedSongs.Add(new CommunitySong { Id = Guid.NewGuid(), CommunityId = community.Id, SongId = def.FeaturedSong.Id, AddedByUserId = def.Creator.Id, AddedAt = DateTime.UtcNow.AddDays(-2) });
            comments.Add(new CommunityComment { Id = Guid.NewGuid(), CommunityId = community.Id, AuthorId = def.Creator.Id, AuthorName = def.Creator.Name, Content = $"¡Bienvenidos a {def.Name}! Compartan sus pistas favoritas y reseñas aquí.", CreatedAt = DateTime.UtcNow.AddDays(-1) });
            comments.Add(new CommunityComment { Id = Guid.NewGuid(), CommunityId = community.Id, AuthorId = users[4].Id, AuthorName = users[4].Name, Content = $"Excelente selección musical en {def.Name}, el audio desde res0nance.pp.ua suena nítido.", CreatedAt = DateTime.UtcNow.AddHours(-4) });
        }

        return (communities, members, linkedPlaylists, linkedSongs, comments);
    }

    public static (List<Room> Rooms, List<RoomSong> Queue, List<RoomMessage> Messages) BuildRoomsGraph(List<User> users, List<Song> songs)
    {
        var s0 = songs[0];
        var s1 = songs[Math.Min(1, songs.Count - 1)];
        var s2 = songs[Math.Min(2, songs.Count - 1)];
        var s3 = songs[Math.Min(3, songs.Count - 1)];

        var publicRoom = new Room
        {
            Id = Guid.NewGuid(), Code = "RES-2026", Title = "Edge of the Abyss Listening Party", Genre = "Alternative Rock",
            IsPrivate = false, AccessKey = null, MaxCapacity = 50, HostId = users[0].Id, HostName = users[0].Name,
            ListenerCount = 3, IsActive = true, CreatedAt = DateTime.UtcNow.AddHours(-2)
        };
        publicRoom.ApplyTrack(s0);
        publicRoom.CurrentTimeMs = 15000;

        var privateRoom = new Room
        {
            Id = Guid.NewGuid(), Code = "RES-7741", Title = "Midnight Studio Jam", Genre = "Electronic Rock",
            IsPrivate = true, AccessKey = "123456", MaxCapacity = 50, HostId = users[1].Id, HostName = users[1].Name,
            ListenerCount = 1, IsActive = true, CreatedAt = DateTime.UtcNow.AddHours(-1)
        };
        privateRoom.ApplyTrack(s1);
        privateRoom.IsPlaying = false;

        var queue = new List<RoomSong>
        {
            new() { Id = Guid.NewGuid(), RoomId = publicRoom.Id, SongId = s1.Id, Title = s1.Title, Artist = s1.Artist, Url = s1.AudioUrl, CoverUrl = s1.CoverImageUrl, DurationSeconds = s1.DurationInSeconds, RequestedBy = users[1].Name, VoteCount = 2, VoterIdsJson = $"[\"{users[1].Id}\",\"{users[2].Id}\"]", OrderIndex = 0, AddedAt = DateTime.UtcNow.AddMinutes(-20) },
            new() { Id = Guid.NewGuid(), RoomId = publicRoom.Id, SongId = s2.Id, Title = s2.Title, Artist = s2.Artist, Url = s2.AudioUrl, CoverUrl = s2.CoverImageUrl, DurationSeconds = s2.DurationInSeconds, RequestedBy = users[2].Name, VoteCount = 1, VoterIdsJson = $"[\"{users[2].Id}\"]", OrderIndex = 1, AddedAt = DateTime.UtcNow.AddMinutes(-15) },
            new() { Id = Guid.NewGuid(), RoomId = privateRoom.Id, SongId = s3.Id, Title = s3.Title, Artist = s3.Artist, Url = s3.AudioUrl, CoverUrl = s3.CoverImageUrl, DurationSeconds = s3.DurationInSeconds, RequestedBy = users[0].Name, VoteCount = 1, VoterIdsJson = $"[\"{users[0].Id}\"]", OrderIndex = 0, AddedAt = DateTime.UtcNow.AddMinutes(-10) }
        };

        var messages = new List<RoomMessage>
        {
            new() { Id = Guid.NewGuid(), RoomId = publicRoom.Id, SenderId = users[0].Id, SenderName = users[0].Name, Content = "Sala sincronizada activa (< 200 ms). ¡Voten la siguiente canción en la cola!", SentAt = DateTime.UtcNow.AddMinutes(-25) },
            new() { Id = Guid.NewGuid(), RoomId = publicRoom.Id, SenderId = users[2].Id, SenderName = users[2].Name, Content = "Increíble el stream directo desde musica.res0nance.pp.ua.", SentAt = DateTime.UtcNow.AddMinutes(-12) },
            new() { Id = Guid.NewGuid(), RoomId = privateRoom.Id, SenderId = users[1].Id, SenderName = users[1].Name, Content = "Sesión privada lista. Comparte el código RES-7741 y la clave de 6 dígitos.", SentAt = DateTime.UtcNow.AddMinutes(-8) }
        };

        return (new List<Room> { publicRoom, privateRoom }, queue, messages);
    }
}
