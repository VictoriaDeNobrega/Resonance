using Resonance.Api.DTOs;

namespace Resonance.Api.Hubs;

public interface IRealtimeBroadcaster
{
    Task BroadcastPlaybackStateAsync(string roomCode, RoomDetailDto room, CancellationToken ct = default);
    Task BroadcastQueueUpdatedAsync(string roomCode, IReadOnlyCollection<RoomSongDto> queue, CancellationToken ct = default);
    Task BroadcastSkipVoteAsync(SkipVoteResultDto skipResult, CancellationToken ct = default);
    Task BroadcastListenerCountAsync(string roomCode, int listenerCount, int maxCapacity, CancellationToken ct = default);
    Task BroadcastRoomClosedAsync(string roomCode, string message, CancellationToken ct = default);
    Task BroadcastChatMessageAsync(string roomCode, RoomMessageDto message, CancellationToken ct = default);
    Task BroadcastUserLeftAsync(string roomCode, Guid? userId, string userName, int listenerCount, CancellationToken ct = default);
    Task BroadcastCommunityCommentAsync(Guid communityId, CommunityCommentDto comment, CancellationToken ct = default);
    Task BroadcastCommunityCommentDeletedAsync(Guid communityId, Guid commentId, CancellationToken ct = default);
}
