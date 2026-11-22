using Microsoft.AspNetCore.Mvc;
using Resonance.Api.DTOs;
using Resonance.Api.Services;

namespace Resonance.Api.Controllers;

[Route("api/[controller]")]
public class AuthController : ApiControllerBase
{
    private readonly IAuthService _authService;

    public AuthController(IAuthService authService)
    {
        _authService = authService;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register([FromBody] RegisterRequestDto dto, CancellationToken ct) =>
        ToActionResult(await _authService.RegisterAsync(dto, ct));

    [HttpPost("confirm")]
    public async Task<IActionResult> ConfirmAccount([FromBody] ConfirmAccountRequestDto dto, CancellationToken ct) =>
        ToActionResult(await _authService.ConfirmAccountAsync(dto, ct));

    [HttpPost("login")]
    public async Task<IActionResult> Login([FromBody] LoginRequestDto dto, CancellationToken ct) =>
        ToActionResult(await _authService.LoginAsync(dto, ct));

    [HttpPost("logout/{id:guid}")]
    public async Task<IActionResult> Logout(Guid id, CancellationToken ct) =>
        ToMessageResult(await _authService.LogoutAsync(id, ct), "Sesión cerrada correctamente.");

    [HttpGet("profile/{id:guid}")]
    public async Task<IActionResult> GetProfile(Guid id, CancellationToken ct) =>
        ToActionResult(await _authService.GetProfileAsync(id, ct));

    [HttpPut("update/{id:guid}")]
    public async Task<IActionResult> UpdateProfile(Guid id, [FromBody] UpdateProfileRequestDto dto, CancellationToken ct) =>
        ToActionResult(await _authService.UpdateProfileAsync(id, dto, ct));

    [HttpPut("session-state/{id:guid}")]
    public async Task<IActionResult> UpdateSessionState(Guid id, [FromBody] SessionStateUpdateDto dto, CancellationToken ct) =>
        ToActionResult(await _authService.UpdateSessionStateAsync(id, dto, ct));

    [HttpGet("users/search")]
    public async Task<IActionResult> SearchUsers([FromQuery] string? query, [FromQuery] int limit = 20, CancellationToken ct = default) =>
        Ok(await _authService.SearchUsersAsync(query, limit, ct));
}
