using Resonance.Api.DTOs;

namespace Resonance.Api.Services;

public interface ISongService
{
    Task<HomeSongsResponseDto> GetHomeSongsAsync(Guid? userId = null, CancellationToken ct = default);
    Task<GlobalSearchResultDto> GlobalSearchAsync(string? query, string? genre = null, string? artist = null, string? filter = "all", Guid? userId = null, CancellationToken ct = default);
    Task<PagedSongsResultDto> SearchSongsAsync(string? query, string? genre = null, string? artist = null, int page = 1, int pageSize = 20, Guid? userId = null, CancellationToken ct = default);
    Task<ServiceResult<SongDetailDto>> GetSongByIdAsync(Guid songId, Guid? userId = null, CancellationToken ct = default);
    Task<ServiceResult<SongDto>> CreateSongAsync(CreateSongDto dto, CancellationToken ct = default);
    Task<ServiceResult<SongDto>> UpdateSongAsync(Guid songId, UpdateSongDto dto, CancellationToken ct = default);
    Task<ServiceResult<bool>> DeleteSongAsync(Guid songId, CancellationToken ct = default);
    Task<ServiceResult<SongDto>> RegisterPlayAsync(Guid songId, Guid? userId = null, CancellationToken ct = default);
    Task<ServiceResult<FavoriteToggleResponseDto>> ToggleFavoriteAsync(Guid songId, Guid userId, CancellationToken ct = default);
    Task<List<SongDto>> GetUserFavoritesAsync(Guid userId, CancellationToken ct = default);
    Task<ServiceResult<List<ReviewDto>>> GetReviewsAsync(Guid songId, CancellationToken ct = default);
    Task<ServiceResult<ReviewDto>> AddReviewAsync(Guid songId, CreateReviewDto dto, CancellationToken ct = default);
    Task<PlaybackStatsDto> GetGlobalStatsAsync(Guid? userId = null, CancellationToken ct = default);
    Task<ServiceResult<SongStatsDto>> GetSongStatsAsync(Guid songId, CancellationToken ct = default);
    Task<MusicServerStatusDto> GetMusicServerStatusAsync(CancellationToken ct = default);
    Task<MusicServerSyncResultDto> SyncWithMusicServerAsync(string source = "primary", CancellationToken ct = default);
}
