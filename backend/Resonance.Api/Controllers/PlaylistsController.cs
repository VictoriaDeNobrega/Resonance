using Microsoft.AspNetCore.Mvc;
using Resonance.DTOs;
using Resonance.Services;

namespace Resonance.Api.Controllers;
{
    [ApiController]
    [Route("api/[controller]")]
    public class PlaylistsController : ControllerBase
    {
        private readonly IPlaylistService _playlistService;

        public PlaylistsController(IPlaylistService playlistService)
        {
            _playlistService = playlistService;
        }

        [HttpPost]
        public async Task<IActionResult> CreatePlaylist([FromBody] CreatePlaylistDto dto)
        {
            string? userId = Request.Headers["x-user-id"].FirstOrDefault();
            if (string.IsNullOrEmpty(userId)) return Unauthorized(new { error = "Usuario no autenticado." });

            var result = await _playlistService.CreateAsync(userId, dto);
            return CreatedAtAction(nameof(GetUserPlaylists), new { userId }, result);
        }

        [HttpGet("user")]
        public async Task<IActionResult> GetUserPlaylists()
        {
            string? userId = Request.Headers["x-user-id"].FirstOrDefault();
            if (string.IsNullOrEmpty(userId)) return Unauthorized(new { error = "Usuario no autenticado." });

            var playlists = await _playlistService.GetUserPlaylistsAsync(userId);
            return Ok(playlists);
        }

        [HttpPut("{id:guid}")]
        public async Task<IActionResult> UpdatePlaylist(Guid id, [FromBody] UpdatePlaylistDto dto)
        {
            string? userId = Request.Headers["x-user-id"].FirstOrDefault();
            if (string.IsNullOrEmpty(userId)) return Unauthorized(new { error = "Usuario no autenticado." });

            try
            {
                var updated = await _playlistService.UpdateDetailsAsync(id, userId, dto);
                if (updated == null) return NotFound(new { error = "Playlist no encontrada." });
                return Ok(updated);
            }
            catch (UnauthorizedAccessException ex)
            {
                return StatusCode(StatusCodes.Status403Forbidden, new { error = ex.Message });
            }
        }
    }
}
