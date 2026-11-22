using Microsoft.AspNetCore.SignalR;
using Resonance.Api.DTOs;
using Resonance.Api.Models;

namespace Resonance.Api.Hubs;

public class RealtimeBroadcaster : IRealtimeBroadcaster
{
    private readonly IHubContext<RoomHub> _roomHubContext;
    private readonly IHubContext<CommunityHub> _communityHubContext;

    public RealtimeBroadcaster(
        IHubContext<RoomHub> roomHubContext,
        IHubContext<CommunityHub> communityHubContext)
    {
        _roomHubContext = roomHubContext;
        _communityHubContext = communityHubContext;
    }

    public static string GetRoomGroupName(string roomCode) =>
        $"room:{Room.NormalizeCode(roomCode)}";

    public static string GetCommunityGroupName(Guid communityId) =>
        $"community:{communityId:D}";

    public Task BroadcastPlaybackStateAsync(string roomCode, RoomDetailDto room, CancellationToken ct = default) =>
        _roomHubContext.Clients
            .Group(GetRoomGroupName(roomCode))
            .SendAsync("PlaybackStateUpdated", SyncPlaybackDto.FromRoom(room), ct);

    public Task BroadcastQueueUpdatedAsync(string roomCode, IReadOnlyCollection<RoomSongDto> queue, CancellationToken ct = default) =>
        _roomHubContext.Clients
            .Group(GetRoomGroupName(roomCode))
            .SendAsync("QueueUpdated", queue, ct);

    public async Task BroadcastSkipVoteAsync(SkipVoteResultDto skipResult, CancellationToken ct = default)
    {
        var groupName = GetRoomGroupName(skipResult.RoomCode);
        await _roomHubContext.Clients.Group(groupName).SendAsync("SkipVoteUpdated", new
        {
            roomCode = skipResult.RoomCode,
            currentVotes = skipResult.CurrentVotes,
            votesRequired = skipResult.VotesRequired,
            trackSkipped = skipResult.TrackSkipped
        }, ct);

        if (skipResult.TrackSkipped && skipResult.UpdatedRoom is not null)
        {
            var updated = skipResult.UpdatedRoom;
            await _roomHubContext.Clients.Group(groupName).SendAsync("TrackSkipped", updated, ct);
            await BroadcastQueueUpdatedAsync(skipResult.RoomCode, updated.Queue, ct);
            await BroadcastPlaybackStateAsync(skipResult.RoomCode, updated, ct);
        }
    }

    public Task BroadcastListenerCountAsync(string roomCode, int listenerCount, int maxCapacity, CancellationToken ct = default)
    {
        var normalizedCode = Room.NormalizeCode(roomCode);
        return _roomHubContext.Clients.Group(GetRoomGroupName(normalizedCode)).SendAsync("ListenerCountUpdated", new
        {
            roomCode = normalizedCode,
            listenerCount,
            maxCapacity
        }, ct);
    }

    public Task BroadcastRoomClosedAsync(string roomCode, string message, CancellationToken ct = default)
    {
        var normalizedCode = Room.NormalizeCode(roomCode);
        return _roomHubContext.Clients.Group(GetRoomGroupName(normalizedCode)).SendAsync("RoomClosed", new
        {
            roomCode = normalizedCode,
            message,
            timestampUtcMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        }, ct);
    }

    public Task BroadcastChatMessageAsync(string roomCode, RoomMessageDto message, CancellationToken ct = default) =>
        _roomHubContext.Clients
            .Group(GetRoomGroupName(roomCode))
            .SendAsync("ReceiveChatMessage", message, ct);

    public Task BroadcastUserLeftAsync(string roomCode, Guid? userId, string userName, int listenerCount, CancellationToken ct = default)
    {
        var normalizedCode = Room.NormalizeCode(roomCode);
        return _roomHubContext.Clients.Group(GetRoomGroupName(normalizedCode)).SendAsync("UserLeft", new
        {
            roomCode = normalizedCode,
            userId,
            userName,
            listenerCount,
            timestampUtcMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
        }, ct);
    }

    public async Task BroadcastCommunityCommentAsync(Guid communityId, CommunityCommentDto comment, CancellationToken ct = default)
    {
        var groupName = GetCommunityGroupName(communityId);
        await Task.WhenAll(
            _roomHubContext.Clients.Group(groupName).SendAsync("ReceiveCommunityComment", comment, ct),
            _communityHubContext.Clients.Group(groupName).SendAsync("ReceiveCommunityComment", comment, ct));
    }

    public async Task BroadcastCommunityCommentDeletedAsync(Guid communityId, Guid commentId, CancellationToken ct = default)
    {
        var groupName = GetCommunityGroupName(communityId);
        var payload = new { communityId, commentId };
        await Task.WhenAll(
            _roomHubContext.Clients.Group(groupName).SendAsync("CommunityCommentDeleted", payload, ct),
            _communityHubContext.Clients.Group(groupName).SendAsync("CommunityCommentDeleted", payload, ct));
    }
}
