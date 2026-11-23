using Resonance.Api.Data;
using Resonance.Api.DTOs;
using Resonance.Api.Models;

namespace Resonance.Api.Services;

public class SongService : ISongService
{
    private readonly SongRepository _songRepository;
    private readonly INavidromeService _navidromeService;
    private readonly ISearchService _searchService;

    public SongService(SongRepository songRepository, INavidromeService navidromeService, ISearchService searchService)
    {
        _songRepository = songRepository;
        _navidromeService = navidromeService;
        _searchService = searchService;
    }

    public async Task<HomeSongsResponseDto> GetHomeSongsAsync(Guid? userId = null, string? server = null, CancellationToken ct = default)
    {
        var dtos = (await _songRepository.GetAllWithDetailsAsync(server, ct)).Select(s => SongDto.FromEntity(s, userId)).ToList();
        var trending = dtos.OrderByDescending(s => s.PlayCount).ThenByDescending(s => s.AverageRating).Take(8).ToList();
        var recent = dtos.OrderByDescending(s => s.CreatedAt).Take(10).ToList();

        return new HomeSongsResponseDto
        {
            FeaturedSong = trending.FirstOrDefault() ?? recent.FirstOrDefault(),
            TrendingSongs = trending,
            RecentSongs = recent,
            AllSongs = dtos.OrderBy(s => s.Title).ToList(),
            Genres = dtos.Select(s => s.Genre).Where(g => !string.IsNullOrWhiteSpace(g)).Distinct(StringComparer.OrdinalIgnoreCase).OrderBy(g => g).ToList(),
            TotalSongs = dtos.Count,
            TotalPlays = dtos.Sum(s => (long)s.PlayCount)
        };
    }

    public Task<GlobalSearchResultDto> GlobalSearchAsync(
        string? query, string? genre = null, string? artist = null, string? filter = "all", Guid? userId = null, string? server = null, CancellationToken ct = default) =>
        _searchService.GlobalSearchAsync(query, genre, artist, filter, userId, server, ct);

    public async Task<PagedSongsResultDto> SearchSongsAsync(
        string? query, string? genre = null, string? artist = null, int page = 1, int pageSize = 500, Guid? userId = null, string? server = null, CancellationToken ct = default)
    {
        var safePage = Math.Max(1, page);
        var safePageSize = Math.Clamp(pageSize, 1, 2000);
        var (items, totalCount) = await _songRepository.SearchPagedAsync(query, genre, artist, server, safePage, safePageSize, ct);
        return new PagedSongsResultDto
        {
            Items = items.Select(s => SongDto.FromEntity(s, userId)).ToList(),
            TotalCount = totalCount, Page = safePage, PageSize = safePageSize
        };
    }

    public async Task<ServiceResult<SongDetailDto>> GetSongByIdAsync(Guid songId, Guid? userId = null, CancellationToken ct = default)
    {
        var song = await _songRepository.GetByIdWithFullDetailsAsync(songId, ct);
        return song is null
            ? ServiceResult<SongDetailDto>.NotFound("Canción no encontrada.")
            : ServiceResult<SongDetailDto>.Ok(SongDetailDto.FromEntity(song, userId));
    }

    public async Task<ServiceResult<SongDto>> CreateSongAsync(CreateSongDto dto, CancellationToken ct = default)
    {
        var title = dto.Title?.Trim() ?? string.Empty;
        var artist = dto.Artist?.Trim() ?? string.Empty;
        var genre = dto.Genre?.Trim() ?? string.Empty;
        var audioUrl = dto.AudioUrl?.Trim() ?? string.Empty;

        if (string.IsNullOrWhiteSpace(title)) return ServiceResult<SongDto>.BadRequest("El título de la canción es obligatorio.");
        if (string.IsNullOrWhiteSpace(artist)) return ServiceResult<SongDto>.BadRequest("El artista es obligatorio.");
        if (string.IsNullOrWhiteSpace(genre)) return ServiceResult<SongDto>.BadRequest("El género es obligatorio.");
        if (string.IsNullOrWhiteSpace(audioUrl)) return ServiceResult<SongDto>.BadRequest("La URL de audio es obligatoria.");

        var uploaderName = string.IsNullOrWhiteSpace(dto.UploadedByName) ? "Resonance" : dto.UploadedByName.Trim();
        Guid? uploaderId = null;

        if (dto.UploadedById is { } uid && uid != Guid.Empty)
        {
            var uploader = await _songRepository.FindUserAsync(uid, track: false, ct);
            if (uploader is not null) { uploaderId = uploader.Id; uploaderName = uploader.Name; }
        }

        var song = new Song
        {
            Id = Guid.NewGuid(), Title = title, Artist = artist, Album = dto.Album?.Trim() ?? string.Empty,
            Genre = genre, DurationInSeconds = Math.Max(0, dto.DurationInSeconds), AudioUrl = audioUrl,
            CoverImageUrl = dto.CoverImageUrl?.Trim() ?? string.Empty, Description = dto.Description?.Trim() ?? string.Empty,
            UploadedById = uploaderId, UploadedByName = uploaderName, CreatedAt = DateTime.UtcNow
        };
        await _songRepository.AddAsync(song, ct);
        return ServiceResult<SongDto>.Created(SongDto.FromEntity(song, uploaderId));
    }

    public async Task<ServiceResult<SongDto>> UpdateSongAsync(Guid songId, UpdateSongDto dto, CancellationToken ct = default)
    {
        var song = await _songRepository.GetByIdForUpdateAsync(songId, includeRelations: true, ct);
        if (song is null) return ServiceResult<SongDto>.NotFound("Canción no encontrada.");

        if (dto.Title is not null && string.IsNullOrWhiteSpace(dto.Title)) return ServiceResult<SongDto>.BadRequest("El título de la canción no puede estar vacío.");
        if (dto.Artist is not null && string.IsNullOrWhiteSpace(dto.Artist)) return ServiceResult<SongDto>.BadRequest("El artista no puede estar vacío.");
        if (dto.Genre is not null && string.IsNullOrWhiteSpace(dto.Genre)) return ServiceResult<SongDto>.BadRequest("El género no puede estar vacío.");
        if (dto.AudioUrl is not null && string.IsNullOrWhiteSpace(dto.AudioUrl)) return ServiceResult<SongDto>.BadRequest("La URL de audio no puede estar vacía.");
        if (dto.DurationInSeconds is < 0) return ServiceResult<SongDto>.BadRequest("La duración no puede ser negativa.");

        if (dto.Title is not null) song.Title = dto.Title.Trim();
        if (dto.Artist is not null) song.Artist = dto.Artist.Trim();
        if (dto.Album is not null) song.Album = dto.Album.Trim();
        if (dto.Genre is not null) song.Genre = dto.Genre.Trim();
        if (dto.DurationInSeconds.HasValue) song.DurationInSeconds = dto.DurationInSeconds.Value;
        if (dto.AudioUrl is not null) song.AudioUrl = dto.AudioUrl.Trim();
        if (dto.CoverImageUrl is not null) song.CoverImageUrl = dto.CoverImageUrl.Trim();
        if (dto.Description is not null) song.Description = dto.Description.Trim();

        await _songRepository.SaveChangesAsync(ct);
        return ServiceResult<SongDto>.Ok(SongDto.FromEntity(song));
    }

    public async Task<ServiceResult<bool>> DeleteSongAsync(Guid songId, CancellationToken ct = default)
    {
        var song = await _songRepository.GetByIdForUpdateAsync(songId, includeRelations: false, ct);
        if (song is null) return ServiceResult<bool>.NotFound("Canción no encontrada.");
        await _songRepository.RemoveAsync(song, ct);
        return ServiceResult<bool>.Ok(true);
    }

    public async Task<ServiceResult<SongDto>> RegisterPlayAsync(Guid songId, Guid? userId = null, CancellationToken ct = default)
    {
        var song = await _songRepository.GetByIdForUpdateAsync(songId, includeRelations: true, ct);
        if (song is null) return ServiceResult<SongDto>.NotFound("Canción no encontrada.");

        song.RegisterPlay();
        if (userId is { } uid && uid != Guid.Empty)
        {
            var user = await _songRepository.FindUserAsync(uid, track: true, ct);
            if (user is not null) { user.LastPlayedSongId = song.Id; user.LastPlaybackPositionMs = 0; }
        }

        await _songRepository.SaveChangesAsync(ct);
        return ServiceResult<SongDto>.Ok(SongDto.FromEntity(song, userId));
    }

    public async Task<ServiceResult<FavoriteToggleResponseDto>> ToggleFavoriteAsync(Guid songId, Guid userId, CancellationToken ct = default)
    {
        if (!await _songRepository.ExistsAsync(songId, ct)) return ServiceResult<FavoriteToggleResponseDto>.NotFound("Canción no encontrada.");
        if (!await _songRepository.UserExistsAsync(userId, ct)) return ServiceResult<FavoriteToggleResponseDto>.NotFound("Usuario no encontrado.");

        var (isFavorite, favoriteCount) = await _songRepository.ToggleFavoriteAsync(songId, userId, ct);
        return ServiceResult<FavoriteToggleResponseDto>.Ok(new FavoriteToggleResponseDto
        {
            SongId = songId, UserId = userId, IsFavorite = isFavorite, FavoriteCount = favoriteCount
        });
    }

    public async Task<List<SongDto>> GetUserFavoritesAsync(Guid userId, CancellationToken ct = default) =>
        (await _songRepository.GetUserFavoritesAsync(userId, ct)).Select(s => SongDto.FromEntity(s, userId)).ToList();

    public async Task<ServiceResult<List<ReviewDto>>> GetReviewsAsync(Guid songId, CancellationToken ct = default)
    {
        if (!await _songRepository.ExistsAsync(songId, ct)) return ServiceResult<List<ReviewDto>>.NotFound("Canción no encontrada.");
        return ServiceResult<List<ReviewDto>>.Ok((await _songRepository.GetReviewsAsync(songId, ct)).Select(ReviewDto.FromEntity).ToList());
    }

    public async Task<ServiceResult<ReviewDto>> AddReviewAsync(Guid songId, CreateReviewDto dto, CancellationToken ct = default)
    {
        if (dto.Rating < 1 || dto.Rating > 5) return ServiceResult<ReviewDto>.BadRequest("La calificación debe estar entre 1 y 5 estrellas.");
        var content = dto.Content?.Trim() ?? string.Empty;
        if (content.Length < 2) return ServiceResult<ReviewDto>.BadRequest("La reseña debe contener al menos 2 caracteres.");
        if (!await _songRepository.ExistsAsync(songId, ct)) return ServiceResult<ReviewDto>.NotFound("Canción no encontrada.");

        var user = await _songRepository.FindUserAsync(dto.UserId, track: false, ct);
        if (user is null) return ServiceResult<ReviewDto>.NotFound("Usuario no encontrado.");

        var review = new Review
        {
            Id = Guid.NewGuid(), SongId = songId, UserId = user.Id,
            UserName = string.IsNullOrWhiteSpace(dto.UserName) ? user.Name : dto.UserName.Trim(),
            Rating = dto.Rating, Content = content, CreatedAt = DateTime.UtcNow
        };
        await _songRepository.AddReviewAsync(review, ct);
        return ServiceResult<ReviewDto>.Created(ReviewDto.FromEntity(review));
    }

    public async Task<PlaybackStatsDto> GetGlobalStatsAsync(Guid? userId = null, string? server = null, CancellationToken ct = default)
    {
        var songs = await _songRepository.GetAllWithDetailsAsync(server, ct);
        var allReviews = songs.SelectMany(s => s.Reviews).ToList();

        return new PlaybackStatsDto
        {
            TotalSongs = songs.Count,
            TotalPlays = songs.Sum(s => (long)s.PlayCount),
            TotalFavorites = songs.Sum(s => s.FavoritedByUsers.Count),
            TotalReviews = allReviews.Count,
            GlobalAverageRating = allReviews.Count > 0 ? Math.Round(allReviews.Average(r => r.Rating), 2) : 0.0,
            TopSongs = songs.OrderByDescending(s => s.PlayCount).ThenByDescending(s => s.FavoritedByUsers.Count).Take(10).Select(s => SongDto.FromEntity(s, userId)).ToList(),
            PlaysByGenre = songs.GroupBy(s => string.IsNullOrWhiteSpace(s.Genre) ? "Sin género" : s.Genre)
                .Select(g => new GenreStatDto { Genre = g.Key, SongCount = g.Count(), TotalPlays = g.Sum(s => (long)s.PlayCount) })
                .OrderByDescending(g => g.TotalPlays).ThenByDescending(g => g.SongCount).ToList(),
            TopArtists = songs.GroupBy(s => string.IsNullOrWhiteSpace(s.Artist) ? "Desconocido" : s.Artist)
                .Select(g => new ArtistStatDto { Artist = g.Key, SongCount = g.Count(), TotalPlays = g.Sum(s => (long)s.PlayCount) })
                .OrderByDescending(a => a.TotalPlays).ThenByDescending(a => a.SongCount).Take(10).ToList()
        };
    }

    public async Task<ServiceResult<SongStatsDto>> GetSongStatsAsync(Guid songId, CancellationToken ct = default)
    {
        var song = await _songRepository.GetByIdWithFullDetailsAsync(songId, ct);
        return song is null ? ServiceResult<SongStatsDto>.NotFound("Canción no encontrada.") : ServiceResult<SongStatsDto>.Ok(SongStatsDto.FromEntity(song));
    }

    public Task<MusicServerStatusDto> GetMusicServerStatusAsync(CancellationToken ct = default) => _navidromeService.GetMusicServerStatusAsync(ct);

    public Task<MusicServerSyncResultDto> SyncWithMusicServerAsync(string source = "primary", CancellationToken ct = default) => _navidromeService.SyncWithMusicServerAsync(source, ct);
}
