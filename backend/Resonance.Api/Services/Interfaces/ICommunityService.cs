using Resonance.Api.DTOs.Communities;

namespace Resonance.Api.Services.Interfaces;

public interface ICommunityService
{
    Task<List<CommunityDto>> GetAllAsync(string? search = null, string? categoryType = null);
    Task<CommunityDto?> GetByIdAsync(Guid id);
    Task<CommunityDto> CreateAsync(CreateCommunityDto dto);
    Task<CommunityDto> UpdateAsync(Guid id, UpdateCommunityDto dto, string requestingUserId);
    Task<bool> DeleteAsync(Guid id, string requestingUserId);
    Task<CommunityPlaylistDto> AddPlaylistAsync(Guid communityId, AddCommunityPlaylistDto dto, string requestingUserId);
    Task<bool> RemovePlaylistAsync(Guid communityId, string playlistId, string requestingUserId);
    Task<bool> ExistsNameAsync(string name, Guid? excludeId = null);
}

