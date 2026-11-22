using Microsoft.AspNetCore.Mvc;
using Resonance.Api.DTOs;
using Resonance.Api.Hubs;
using Resonance.Api.Services;

namespace Resonance.Api.Controllers;

[Route("api/[controller]")]
public class RoomsController : ApiControllerBase
{
    private readonly IRoomService _roomService;
    private readonly IRealtimeBroadcaster _broadcaster;

    public RoomsController(IRoomService roomService, IRealtimeBroadcaster broadcaster)
    {
        _roomService = roomService;
        _broadcaster = broadcaster;
    }

    [HttpGet]
    public async Task<IActionResult> GetActiveRooms(
        [FromQuery] string? genre = null,
        [FromQuery] string? search = null,
        CancellationToken ct = default) =>
        Ok(await _roomService.GetActiveRoomsAsync(genre, search, ct));

    [HttpGet("{code}")]
    public async Task<IActionResult> GetRoomByCode(string code, CancellationToken ct) =>
        ToActionResult(await _roomService.GetRoomByCodeAsync(code, includeAccessKey: false, ct));

    [HttpPost]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomDto dto, CancellationToken ct) =>
        ToActionResult(await _roomService.CreateRoomAsync(dto, ct));

    [HttpPost("{code}/join")]
    public async Task<IActionResult> JoinRoom(string code, [FromBody] JoinRoomRequestDto dto, CancellationToken ct)
    {
        var result = await _roomService.JoinRoomAsync(code, dto, ct);
        if (result.Success && result.Data is not null)
        {
            await _broadcaster.BroadcastListenerCountAsync(result.Data.Code, result.Data.ListenerCount, result.Data.MaxCapacity, ct);
        }

        return ToActionResult(result);
    }

    [HttpPost("{code}/leave")]
    public async Task<IActionResult> LeaveRoom(string code, [FromQuery] Guid? userId = null, CancellationToken ct = default)
    {
        var result = await _roomService.LeaveRoomAsync(code, userId, ct);
        if (result.Success && result.Data is not null)
        {
            await _broadcaster.BroadcastListenerCountAsync(result.Data.Code, result.Data.ListenerCount, result.Data.MaxCapacity, ct);
        }

        return ToActionResult(result);
    }

    [HttpPut("{code}/playback")]
    public async Task<IActionResult> SyncPlayback(string code, [FromBody] SyncPlaybackDto dto, CancellationToken ct)
    {
        var result = await _roomService.SyncPlaybackStateAsync(code, dto, ct);
        if (result.Success && result.Data is not null)
        {
            await _broadcaster.BroadcastPlaybackStateAsync(result.Data.Code, result.Data, ct);
        }

        return ToActionResult(result);
    }

    [HttpPost("{code}/queue")]
    public async Task<IActionResult> AddSongToQueue(string code, [FromBody] AddRoomSongDto dto, CancellationToken ct)
    {
        var result = await _roomService.AddSongToQueueAsync(code, dto, ct);
        if (result.Success && result.Data is not null)
        {
            await _broadcaster.BroadcastQueueUpdatedAsync(result.Data.Code, result.Data.Queue, ct);
            await _broadcaster.BroadcastPlaybackStateAsync(result.Data.Code, result.Data, ct);
        }

        return ToActionResult(result);
    }

    [HttpDelete("{code}/queue/{roomSongId:guid}")]
    public async Task<IActionResult> RemoveSongFromQueue(
        string code,
        Guid roomSongId,
        [FromQuery] Guid? requesterId = null,
        CancellationToken ct = default)
    {
        var result = await _roomService.RemoveSongFromQueueAsync(code, roomSongId, requesterId, ct);
        if (result.Success && result.Data is not null)
        {
            await _broadcaster.BroadcastQueueUpdatedAsync(result.Data.Code, result.Data.Queue, ct);
        }

        return ToActionResult(result);
    }

    [HttpPost("{code}/queue/{roomSongId:guid}/vote")]
    public async Task<IActionResult> VoteQueueSong(
        string code,
        Guid roomSongId,
        [FromBody] VoteRoomSongRequestDto dto,
        CancellationToken ct)
    {
        var result = await _roomService.VoteQueueSongAsync(code, roomSongId, dto.UserId, ct);
        if (result.Success && result.Data is not null)
        {
            await _broadcaster.BroadcastQueueUpdatedAsync(result.Data.Code, result.Data.Queue, ct);
        }

        return ToActionResult(result);
    }

    [HttpPost("{code}/skip-vote")]
    public async Task<IActionResult> CastSkipVote(
        string code,
        [FromBody] VoteRoomSongRequestDto dto,
        CancellationToken ct)
    {
        var result = await _roomService.CastSkipVoteAsync(code, dto.UserId, ct);
        if (result.Success && result.Data is not null)
        {
            await _broadcaster.BroadcastSkipVoteAsync(result.Data, ct);
        }

        return ToActionResult(result);
    }

    [HttpGet("{code}/messages")]
    public async Task<IActionResult> GetMessages(string code, [FromQuery] int limit = 100, CancellationToken ct = default) =>
        ToActionResult(await _roomService.GetMessagesAsync(code, limit, ct));

    [HttpPost("{code}/messages")]
    public async Task<IActionResult> SendMessage(string code, [FromBody] SendRoomMessageDto dto, CancellationToken ct)
    {
        var result = await _roomService.SendMessageAsync(code, dto, ct);
        if (result.Success && result.Data is not null)
        {
            await _broadcaster.BroadcastChatMessageAsync(code, result.Data, ct);
        }

        return ToActionResult(result);
    }

    [HttpPost("{code}/close")]
    public async Task<IActionResult> CloseRoom(string code, [FromQuery] Guid requesterId, CancellationToken ct)
    {
        if (requesterId == Guid.Empty)
            return BadRequest(new { message = "Debe especificar el requesterId del creador de la sala." });

        var result = await _roomService.CloseRoomAsync(code, requesterId, hardDelete: false, ct);
        if (result.Success)
        {
            await _broadcaster.BroadcastRoomClosedAsync(code, "La sala ha sido cerrada por su creador.", ct);
        }

        return ToMessageResult(result, "Sala cerrada correctamente.");
    }

    [HttpDelete("{code}")]
    public async Task<IActionResult> DeleteRoom(string code, [FromQuery] Guid requesterId, CancellationToken ct)
    {
        if (requesterId == Guid.Empty)
            return BadRequest(new { message = "Debe especificar el requesterId del creador de la sala." });

        var result = await _roomService.CloseRoomAsync(code, requesterId, hardDelete: true, ct);
        if (result.Success)
        {
            await _broadcaster.BroadcastRoomClosedAsync(code, "La sala ha sido eliminada por su creador.", ct);
        }

        return ToMessageResult(result, "Sala eliminada correctamente.");
    }
}
