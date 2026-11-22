using Resonance.Api.DTOs;

namespace Resonance.Api.Services;

public interface IAuthService
{
    Task<ServiceResult<RegisterResponseDto>> RegisterAsync(RegisterRequestDto dto, CancellationToken ct = default);
    Task<ServiceResult<UserProfileDto>> ConfirmAccountAsync(ConfirmAccountRequestDto dto, CancellationToken ct = default);
    Task<ServiceResult<LoginResponseDto>> LoginAsync(LoginRequestDto dto, CancellationToken ct = default);
    Task<ServiceResult<UserProfileDto>> GetProfileAsync(Guid userId, CancellationToken ct = default);
    Task<ServiceResult<UserProfileDto>> UpdateProfileAsync(Guid userId, UpdateProfileRequestDto dto, CancellationToken ct = default);
    Task<ServiceResult<UserProfileDto>> UpdateSessionStateAsync(Guid userId, SessionStateUpdateDto dto, CancellationToken ct = default);
    Task<ServiceResult<bool>> LogoutAsync(Guid userId, CancellationToken ct = default);
    Task<List<UserSearchItemDto>> SearchUsersAsync(string? query, int limit = 20, CancellationToken ct = default);
}
