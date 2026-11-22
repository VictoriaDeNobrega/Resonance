using Resonance.Api.DTOs;
using Resonance.Api.Models;

namespace Resonance.Api.Services;

public interface ICommunityService
{
    Task<List<CommunityDto>> GetCommunitiesAsync(string? search = null, CommunityCategoryType? categoryType = null, string? categoryValue = null, Guid? userId = null, CancellationToken ct = default);
    Task<ServiceResult<CommunityDetailDto>> GetCommunityByIdAsync(Guid communityId, Guid? userId = null, CancellationToken ct = default);
    Task<ServiceResult<CommunityDetailDto>> CreateCommunityAsync(CreateCommunityDto dto, CancellationToken ct = default);
    Task<ServiceResult<CommunityDetailDto>> UpdateCommunityAsync(Guid communityId, UpdateCommunityDto dto, CancellationToken ct = default);
    Task<ServiceResult<bool>> DeleteCommunityAsync(Guid communityId, Guid requesterId, CancellationToken ct = default);
    Task<ServiceResult<CommunityDetailDto>> JoinCommunityAsync(Guid communityId, JoinCommunityRequestDto dto, CancellationToken ct = default);
    Task<ServiceResult<CommunityDetailDto>> LeaveCommunityAsync(Guid communityId, Guid userId, CancellationToken ct = default);
    Task<ServiceResult<CommunityPlaylistDto>> AddPlaylistToCommunityAsync(Guid communityId, AddCommunityPlaylistDto dto, CancellationToken ct = default);
    Task<ServiceResult<bool>> RemovePlaylistFromCommunityAsync(Guid communityId, Guid playlistId, Guid requesterId, CancellationToken ct = default);
    Task<ServiceResult<CommunitySongDto>> AddSongToCommunityAsync(Guid communityId, AddCommunitySongDto dto, CancellationToken ct = default);
    Task<ServiceResult<bool>> RemoveSongFromCommunityAsync(Guid communityId, Guid songId, Guid requesterId, CancellationToken ct = default);
    Task<ServiceResult<List<CommunityCommentDto>>> GetCommentsAsync(Guid communityId, CancellationToken ct = default);
    Task<ServiceResult<CommunityCommentDto>> AddCommentAsync(Guid communityId, CreateCommunityCommentDto dto, CancellationToken ct = default);
    Task<ServiceResult<bool>> DeleteCommentAsync(Guid communityId, Guid commentId, Guid requesterId, CancellationToken ct = default);
}
