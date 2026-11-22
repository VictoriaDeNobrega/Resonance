using Microsoft.AspNetCore.Mvc;
using Resonance.Api.DTOs;
using Resonance.Api.Services;

namespace Resonance.Api.Controllers;

[Route("api/[controller]")]
public class PlaylistsController : ApiControllerBase
{
    private readonly IPlaylistService _playlistService;

    public PlaylistsController(IPlaylistService playlistService)
    {
        _playlistService = playlistService;
    }

    [HttpPost]
    public async Task<IActionResult> CreatePlaylist([FromBody] CreatePlaylistDto dto, CancellationToken ct) =>
        ToActionResult(await _playlistService.CreatePlaylistAsync(dto, ct));

    [HttpGet("user")]
    public async Task<IActionResult> GetUserPlaylistsByQuery([FromQuery] Guid userId, CancellationToken ct)
    {
        if (userId == Guid.Empty)
        {
            return BadRequest(new { message = "Debe indicar un userId válido." });
        }

        return Ok(await _playlistService.GetUserPlaylistsAsync(userId, ct));
    }

    [HttpGet("user/{userId:guid}")]
    public async Task<IActionResult> GetUserPlaylists(Guid userId, CancellationToken ct) =>
        Ok(await _playlistService.GetUserPlaylistsAsync(userId, ct));

    [HttpGet("public")]
    public async Task<IActionResult> GetPublicPlaylists(
        [FromQuery] Guid? excludeUserId = null,
        [FromQuery] string? search = null,
        CancellationToken ct = default) =>
        Ok(await _playlistService.GetPublicPlaylistsAsync(excludeUserId, search, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetPlaylistById(Guid id, CancellationToken ct) =>
        ToActionResult(await _playlistService.GetPlaylistByIdAsync(id, ct));

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdatePlaylist(Guid id, [FromBody] UpdatePlaylistDto dto, CancellationToken ct) =>
        ToActionResult(await _playlistService.UpdatePlaylistAsync(id, dto, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeletePlaylist(Guid id, [FromQuery] Guid? requesterId = null, CancellationToken ct = default) =>
        ToMessageResult(await _playlistService.DeletePlaylistAsync(id, requesterId, ct), "Playlist eliminada correctamente.");

    [HttpPost("{id:guid}/songs/{songId:guid}")]
    public async Task<IActionResult> AddSongToPlaylist(
        Guid id,
        Guid songId,
        [FromQuery] Guid? requesterId = null,
        CancellationToken ct = default) =>
        ToActionResult(await _playlistService.AddSongToPlaylistAsync(id, songId, requesterId, ct));

    [HttpPost("{id:guid}/songs")]
    public async Task<IActionResult> AddSongToPlaylistBody(
        Guid id,
        [FromBody] AddSongToPlaylistRequestDto dto,
        CancellationToken ct = default) =>
        ToActionResult(await _playlistService.AddSongToPlaylistAsync(id, dto.SongId, dto.UserId, ct));

    [HttpDelete("{id:guid}/songs/{songId:guid}")]
    public async Task<IActionResult> RemoveSongFromPlaylist(
        Guid id,
        Guid songId,
        [FromQuery] Guid? requesterId = null,
        CancellationToken ct = default) =>
        ToActionResult(await _playlistService.RemoveSongFromPlaylistAsync(id, songId, requesterId, ct));

    [HttpPut("{id:guid}/songs/reorder")]
    public async Task<IActionResult> ReorderSongs(
        Guid id,
        [FromBody] ReorderPlaylistSongsDto dto,
        CancellationToken ct = default) =>
        ToActionResult(await _playlistService.ReorderSongsAsync(id, dto, ct));
}
