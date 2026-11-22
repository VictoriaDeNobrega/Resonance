using Microsoft.AspNetCore.SignalR;
using Resonance.Api.DTOs;
using Resonance.Api.Models;
using Resonance.Api.Services;

namespace Resonance.Api.Hubs;

public class RoomHub : Hub
{
    private const string RoomCodeItemKey = "RoomCode";
    private const string UserIdItemKey = "UserId";
    private const string UserNameItemKey = "UserName";

    private readonly IRoomService _roomService;
    private readonly ICommunityService _communityService;
    private readonly IRealtimeBroadcaster _broadcaster;

    public RoomHub(IRoomService roomService, ICommunityService communityService, IRealtimeBroadcaster broadcaster)
    {
        _roomService = roomService;
        _communityService = communityService;
        _broadcaster = broadcaster;
    }

    public static string GetRoomGroupName(string roomCode) => RealtimeBroadcaster.GetRoomGroupName(roomCode);
    public static string GetCommunityGroupName(Guid communityId) => RealtimeBroadcaster.GetCommunityGroupName(communityId);

    public async Task JoinRoom(string roomCode, string userId, string userName, string? accessKey = null)
    {
        var normalizedCode = Room.NormalizeCode(roomCode);
        if (string.IsNullOrWhiteSpace(normalizedCode))
        {
            await Clients.Caller.SendAsync("RoomError", new { message = "Código de sala inválido." });
            return;
        }

        var parsedUserId = Guid.TryParse(userId, out var uid) ? uid : Guid.Empty;
        var safeName = string.IsNullOrWhiteSpace(userName) ? "Oyente" : userName.Trim();

        if (Context.Items.TryGetValue(RoomCodeItemKey, out var prevObj) && prevObj is string prevCode &&
            !string.Equals(prevCode, normalizedCode, StringComparison.OrdinalIgnoreCase))
            await LeaveCurrentRoomInternalAsync();

        var alreadyInRoom = Context.Items.TryGetValue(RoomCodeItemKey, out var curObj) &&
            curObj is string curCode && string.Equals(curCode, normalizedCode, StringComparison.OrdinalIgnoreCase);

        var result = alreadyInRoom
            ? await _roomService.GetRoomByCodeAsync(normalizedCode)
            : await _roomService.JoinRoomAsync(normalizedCode, new JoinRoomRequestDto { UserId = parsedUserId, UserName = safeName, AccessKey = accessKey });

        if (!result.Success || result.Data is null)
        {
            await SendErrorAsync("RoomError", result.StatusCode, result.Error, "No se pudo unir a la sala.");
            return;
        }

        var groupName = GetRoomGroupName(normalizedCode);
        await Groups.AddToGroupAsync(Context.ConnectionId, groupName);
        Context.Items[RoomCodeItemKey] = normalizedCode;
        Context.Items[UserIdItemKey] = parsedUserId;
        Context.Items[UserNameItemKey] = safeName;

        await Clients.Caller.SendAsync("RoomJoined", result.Data);
        await _broadcaster.BroadcastListenerCountAsync(normalizedCode, result.Data.ListenerCount, result.Data.MaxCapacity);
        await Clients.OthersInGroup(groupName).SendAsync("UserJoined", new
        {
            roomCode = normalizedCode, userId = parsedUserId, userName = safeName,
            listenerCount = result.Data.ListenerCount, timestampUtcMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        });
    }

    public async Task LeaveRoom(string? roomCode = null)
    {
        if (!string.IsNullOrWhiteSpace(roomCode) && !Context.Items.ContainsKey(RoomCodeItemKey))
            Context.Items[RoomCodeItemKey] = Room.NormalizeCode(roomCode);
        await LeaveCurrentRoomInternalAsync();
    }

    public Task SyncPlaybackState(string roomCode, SyncPlaybackDto dto) =>
        ExecuteAndBroadcastAsync(_roomService.SyncPlaybackStateAsync(Room.NormalizeCode(roomCode), dto), "RoomError", "No se pudo sincronizar la reproducción.",
            data => _broadcaster.BroadcastPlaybackStateAsync(Room.NormalizeCode(roomCode), data));

    public async Task RequestTimeSync(string roomCode)
    {
        var result = await _roomService.GetRoomByCodeAsync(Room.NormalizeCode(roomCode));
        if (result.Success && result.Data is not null)
            await Clients.Caller.SendAsync("PlaybackStateUpdated", SyncPlaybackDto.FromRoom(result.Data));
    }

    public Task AddSongToQueue(string roomCode, AddRoomSongDto dto) =>
        ExecuteAndBroadcastAsync(_roomService.AddSongToQueueAsync(Room.NormalizeCode(roomCode), dto), "RoomError", "No se pudo agregar la canción a la cola.",
            async data =>
            {
                await _broadcaster.BroadcastQueueUpdatedAsync(data.Code, data.Queue);
                await _broadcaster.BroadcastPlaybackStateAsync(data.Code, data);
            });

    public Task RemoveSongFromQueue(string roomCode, Guid roomSongId, Guid requesterId) =>
        ExecuteAndBroadcastAsync(_roomService.RemoveSongFromQueueAsync(Room.NormalizeCode(roomCode), roomSongId, requesterId), "RoomError", "No se pudo eliminar la canción de la cola.",
            data => _broadcaster.BroadcastQueueUpdatedAsync(data.Code, data.Queue));

    public Task VoteQueueSong(string roomCode, Guid roomSongId, Guid userId) =>
        ExecuteAndBroadcastAsync(_roomService.VoteQueueSongAsync(Room.NormalizeCode(roomCode), roomSongId, userId), "RoomError", "No se pudo registrar el voto.",
            data => _broadcaster.BroadcastQueueUpdatedAsync(data.Code, data.Queue));

    public Task CastSkipVote(string roomCode, Guid userId) =>
        ExecuteAndBroadcastAsync(_roomService.CastSkipVoteAsync(Room.NormalizeCode(roomCode), userId), "RoomError", "No se pudo registrar el voto para saltar canción.",
            data => _broadcaster.BroadcastSkipVoteAsync(data));

    public Task SendChatMessage(string roomCode, SendRoomMessageDto dto) =>
        ExecuteAndBroadcastAsync(_roomService.SendMessageAsync(Room.NormalizeCode(roomCode), dto), "RoomError", "No se pudo enviar el mensaje.",
            data => _broadcaster.BroadcastChatMessageAsync(Room.NormalizeCode(roomCode), data));

    public Task CloseRoom(string roomCode, Guid requesterId) =>
        ExecuteAndBroadcastAsync(_roomService.CloseRoomAsync(Room.NormalizeCode(roomCode), requesterId, hardDelete: false), "RoomError", "No se pudo cerrar la sala.",
            _ => _broadcaster.BroadcastRoomClosedAsync(Room.NormalizeCode(roomCode), "La sala ha sido cerrada por su creador."));

    // Compatibilidad de eventos de comunidad delegados a IRealtimeBroadcaster (HU 2.7 / 2.8)
    public Task JoinCommunityChat(Guid communityId) => Groups.AddToGroupAsync(Context.ConnectionId, GetCommunityGroupName(communityId));

    public Task LeaveCommunityChat(Guid communityId) => Groups.RemoveFromGroupAsync(Context.ConnectionId, GetCommunityGroupName(communityId));

    public Task SendCommunityComment(Guid communityId, CreateCommunityCommentDto dto) =>
        ExecuteAndBroadcastAsync(_communityService.AddCommentAsync(communityId, dto), "CommunityError", "No se pudo publicar el comentario.",
            data => _broadcaster.BroadcastCommunityCommentAsync(communityId, data));

    public Task DeleteCommunityComment(Guid communityId, Guid commentId, Guid requesterId) =>
        ExecuteAndBroadcastAsync(_communityService.DeleteCommentAsync(communityId, commentId, requesterId), "CommunityError", "No se pudo eliminar el comentario.",
            _ => _broadcaster.BroadcastCommunityCommentDeletedAsync(communityId, commentId));

    public override async Task OnDisconnectedAsync(Exception? exception)
    {
        await LeaveCurrentRoomInternalAsync();
        await base.OnDisconnectedAsync(exception);
    }

    private async Task LeaveCurrentRoomInternalAsync()
    {
        if (!Context.Items.TryGetValue(RoomCodeItemKey, out var codeObj) || codeObj is not string roomCode) return;

        Guid? userId = Context.Items.TryGetValue(UserIdItemKey, out var uidObj) && uidObj is Guid uid && uid != Guid.Empty ? uid : null;
        var userName = Context.Items.TryGetValue(UserNameItemKey, out var nameObj) && nameObj is string name ? name : "Oyente";

        Context.Items.Remove(RoomCodeItemKey);
        Context.Items.Remove(UserIdItemKey);
        Context.Items.Remove(UserNameItemKey);

        await Groups.RemoveFromGroupAsync(Context.ConnectionId, GetRoomGroupName(roomCode));
        var result = await _roomService.LeaveRoomAsync(roomCode, userId);
        if (result.Success && result.Data is not null)
        {
            await _broadcaster.BroadcastListenerCountAsync(roomCode, result.Data.ListenerCount, result.Data.MaxCapacity);
            await _broadcaster.BroadcastUserLeftAsync(roomCode, userId, userName, result.Data.ListenerCount);
        }
    }

    private async Task ExecuteAndBroadcastAsync<T>(Task<ServiceResult<T>> operation, string errorEvent, string fallbackError, Func<T, Task> onSuccess)
    {
        var result = await operation;
        if (!result.Success || result.Data is null)
        {
            await SendErrorAsync(errorEvent, result.StatusCode, result.Error, fallbackError);
            return;
        }
        await onSuccess(result.Data);
    }

    private Task SendErrorAsync(string eventName, int statusCode, string? error, string fallback) =>
        Clients.Caller.SendAsync(eventName, new { statusCode, message = error ?? fallback });
}
