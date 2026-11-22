using Microsoft.AspNetCore.Mvc;
using Resonance.Api.DTOs;
using Resonance.Api.Hubs;
using Resonance.Api.Models;
using Resonance.Api.Services;

namespace Resonance.Api.Controllers;

[Route("api/[controller]")]
public class CommunitiesController : ApiControllerBase
{
    private readonly ICommunityService _communityService;
    private readonly IRealtimeBroadcaster _broadcaster;

    public CommunitiesController(ICommunityService communityService, IRealtimeBroadcaster broadcaster)
    {
        _communityService = communityService;
        _broadcaster = broadcaster;
    }

    [HttpGet]
    public async Task<IActionResult> GetCommunities(
        [FromQuery] string? search = null,
        [FromQuery] CommunityCategoryType? categoryType = null,
        [FromQuery] string? categoryValue = null,
        [FromQuery] Guid? userId = null,
        CancellationToken ct = default) =>
        Ok(await _communityService.GetCommunitiesAsync(search, categoryType, categoryValue, userId, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetCommunityById(Guid id, [FromQuery] Guid? userId = null, CancellationToken ct = default) =>
        ToActionResult(await _communityService.GetCommunityByIdAsync(id, userId, ct));

    [HttpPost]
    public async Task<IActionResult> CreateCommunity([FromBody] CreateCommunityDto dto, CancellationToken ct) =>
        ToActionResult(await _communityService.CreateCommunityAsync(dto, ct));

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateCommunity(Guid id, [FromBody] UpdateCommunityDto dto, CancellationToken ct) =>
        ToActionResult(await _communityService.UpdateCommunityAsync(id, dto, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteCommunity(Guid id, [FromQuery] Guid requesterId, CancellationToken ct)
    {
        if (requesterId == Guid.Empty)
            return BadRequest(new { message = "Debe especificar el requesterId del dueño de la comunidad." });

        return ToMessageResult(await _communityService.DeleteCommunityAsync(id, requesterId, ct), "Comunidad eliminada correctamente.");
    }

    [HttpPost("{id:guid}/join")]
    public async Task<IActionResult> JoinCommunity(Guid id, [FromBody] JoinCommunityRequestDto dto, CancellationToken ct) =>
        ToActionResult(await _communityService.JoinCommunityAsync(id, dto, ct));

    [HttpDelete("{id:guid}/leave")]
    [HttpPost("{id:guid}/leave")]
    public async Task<IActionResult> LeaveCommunity(Guid id, [FromQuery] Guid userId, CancellationToken ct)
    {
        if (userId == Guid.Empty)
            return BadRequest(new { message = "Debe indicar el userId." });

        return ToActionResult(await _communityService.LeaveCommunityAsync(id, userId, ct));
    }

    [HttpPost("{id:guid}/playlists")]
    public async Task<IActionResult> AddPlaylist(Guid id, [FromBody] AddCommunityPlaylistDto dto, CancellationToken ct) =>
        ToActionResult(await _communityService.AddPlaylistToCommunityAsync(id, dto, ct));

    [HttpDelete("{id:guid}/playlists/{playlistId:guid}")]
    public async Task<IActionResult> RemovePlaylist(Guid id, Guid playlistId, [FromQuery] Guid requesterId, CancellationToken ct)
    {
        if (requesterId == Guid.Empty)
            return BadRequest(new { message = "Debe indicar el requesterId del dueño de la comunidad." });

        return ToMessageResult(
            await _communityService.RemovePlaylistFromCommunityAsync(id, playlistId, requesterId, ct),
            "Playlist removida de la comunidad.");
    }

    [HttpPost("{id:guid}/songs")]
    public async Task<IActionResult> AddSong(Guid id, [FromBody] AddCommunitySongDto dto, CancellationToken ct) =>
        ToActionResult(await _communityService.AddSongToCommunityAsync(id, dto, ct));

    [HttpDelete("{id:guid}/songs/{songId:guid}")]
    public async Task<IActionResult> RemoveSong(Guid id, Guid songId, [FromQuery] Guid requesterId, CancellationToken ct)
    {
        if (requesterId == Guid.Empty)
            return BadRequest(new { message = "Debe indicar el requesterId del dueño de la comunidad." });

        return ToMessageResult(
            await _communityService.RemoveSongFromCommunityAsync(id, songId, requesterId, ct),
            "Canción removida de la comunidad.");
    }

    [HttpGet("{id:guid}/comments")]
    public async Task<IActionResult> GetComments(Guid id, CancellationToken ct) =>
        ToActionResult(await _communityService.GetCommentsAsync(id, ct));

    [HttpPost("{id:guid}/comments")]
    public async Task<IActionResult> AddComment(Guid id, [FromBody] CreateCommunityCommentDto dto, CancellationToken ct)
    {
        var result = await _communityService.AddCommentAsync(id, dto, ct);
        if (result.Success && result.Data is not null)
        {
            await _broadcaster.BroadcastCommunityCommentAsync(id, result.Data, ct);
        }

        return ToActionResult(result);
    }

    [HttpDelete("{id:guid}/comments/{commentId:guid}")]
    public async Task<IActionResult> DeleteComment(Guid id, Guid commentId, [FromQuery] Guid requesterId, CancellationToken ct)
    {
        if (requesterId == Guid.Empty)
            return BadRequest(new { message = "Debe indicar el requesterId." });

        var result = await _communityService.DeleteCommentAsync(id, commentId, requesterId, ct);
        if (result.Success)
        {
            await _broadcaster.BroadcastCommunityCommentDeletedAsync(id, commentId, ct);
        }

        return ToMessageResult(result, "Comentario eliminado correctamente.");
    }
}
