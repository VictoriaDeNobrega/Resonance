using Microsoft.AspNetCore.Mvc;
using Resonance.DTOs;
using Resonance.Services;

namespace Resonance.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class PlaylistsController : ControllerBase
    {
        private readonly PlaylistService _playlistService;

        public PlaylistsController(PlaylistService playlistService) => _playlistService = playlistService;

        [HttpPost]
        public async Task<IActionResult> CreatePlaylist([FromBody] CreatePlaylistDto dto)
        {
            string? userId = Request.Headers["x-user-id"].FirstOrDefault();
            if (string.IsNullOrEmpty(userId)) return Unauthorized(new { error = "Usuario no autenticado." });

            var result = await _playlistService.CreateAsync(userId, dto);
            return CreatedAtAction(nameof(CreatePlaylist), new { id = result.Id }, result);
        }
    }
}
