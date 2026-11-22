using Resonance.Api.DTOs;

namespace Resonance.Api.Services;

public interface IPlaylistService
{
    Task<ServiceResult<PlaylistDetailDto>> CreatePlaylistAsync(CreatePlaylistDto dto, CancellationToken ct = default);
    Task<List<PlaylistDetailDto>> GetUserPlaylistsAsync(Guid userId, CancellationToken ct = default);
    Task<List<PlaylistSummaryDto>> GetPublicPlaylistsAsync(Guid? excludeUserId = null, string? search = null, CancellationToken ct = default);
    Task<ServiceResult<PlaylistDetailDto>> GetPlaylistByIdAsync(Guid playlistId, CancellationToken ct = default);
    Task<ServiceResult<PlaylistDetailDto>> UpdatePlaylistAsync(Guid playlistId, UpdatePlaylistDto dto, CancellationToken ct = default);
    Task<ServiceResult<bool>> DeletePlaylistAsync(Guid playlistId, Guid? requesterId = null, CancellationToken ct = default);
    Task<ServiceResult<PlaylistDetailDto>> AddSongToPlaylistAsync(Guid playlistId, Guid songId, Guid? requesterId = null, CancellationToken ct = default);
    Task<ServiceResult<PlaylistDetailDto>> RemoveSongFromPlaylistAsync(Guid playlistId, Guid songId, Guid? requesterId = null, CancellationToken ct = default);
    Task<ServiceResult<PlaylistDetailDto>> ReorderSongsAsync(Guid playlistId, ReorderPlaylistSongsDto dto, CancellationToken ct = default);
}
