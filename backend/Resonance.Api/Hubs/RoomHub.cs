using System.Collections.Concurrent;
using Microsoft.AspNetCore.SignalR;
using Resonance.Api.DTOs.Rooms;
using Resonance.Api.Models;
using Resonance.Api.Services.Interfaces;

namespace Resonance.Api.Hubs;

public class RoomHub : Hub
{
    private readonly IRoomService _roomService;
    private static readonly ConcurrentDictionary<string, HashSet<string>> _roomUsers = new();
    private static readonly ConcurrentDictionary<string, HashSet<string>> _skipVotes = new();

    public RoomHub(IRoomService roomService)
    {
        _roomService = roomService;
    }

    public async Task JoinRoom(string roomCode, string username)
    {
        roomCode = roomCode.ToUpper();
        await Groups.AddToGroupAsync(Context.ConnectionId, roomCode);

        _roomUsers.AddOrUpdate(roomCode,
            _ => new HashSet<string> { username },
            (_, users) => { lock (users) { users.Add(username); } return users; });

        int userCount = _roomUsers.TryGetValue(roomCode, out var u) ? u.Count : 1;
        await Clients.Group(roomCode).SendAsync("OnUserJoined", username, userCount);
    }

    public async Task LeaveRoom(string roomCode, string username)
    {
        roomCode = roomCode.ToUpper();
        await Groups.RemoveFromGroupAsync(Context.ConnectionId, roomCode);

        if (_roomUsers.TryGetValue(roomCode, out var users))
        {
            lock (users) { users.Remove(username); }
            int userCount = users.Count;
            await Clients.Group(roomCode).SendAsync("OnUserLeft", username, userCount);
        }
    }

    public async Task SyncPlayback(SyncPlaybackDto data)
    {
        data.RoomCode = data.RoomCode.ToUpper();
        await _roomService.UpdatePlaybackStateAsync(data);
        await Clients.OthersInGroup(data.RoomCode).SendAsync("OnPlaybackSynced", data);
    }

    public async Task SendMessage(string roomCode, string senderName, string message)
    {
        roomCode = roomCode.ToUpper();
        var msgDto = new ChatMessageDto
        {
            RoomCode = roomCode,
            SenderName = senderName,
            Message = message.Trim(),
            Timestamp = DateTime.UtcNow.ToString("HH:mm")
        };

        await Clients.Group(roomCode).SendAsync("OnMessageReceived", msgDto);
    }

    public async Task AddToQueue(string roomCode, RoomSong song)
    {
        roomCode = roomCode.ToUpper();
        var success = await _roomService.AddSongToQueueAsync(roomCode, song);
        if (success)
        {
            var updatedRoom = await _roomService.GetRoomByCodeAsync(roomCode);
            await Clients.Group(roomCode).SendAsync("OnQueueUpdated", updatedRoom?.Queue);
        }
    }

    public async Task VoteSkip(string roomCode, string username)
    {
        roomCode = roomCode.ToUpper();
        var votes = _skipVotes.GetOrAdd(roomCode, _ => new HashSet<string>());
        lock (votes)
        {
            votes.Add(username);
        }

        int totalUsers = _roomUsers.TryGetValue(roomCode, out var u) ? Math.Max(1, u.Count) : 1;
        int currentVotes = votes.Count;
        int requiredVotes = (int)Math.Ceiling(totalUsers / 2.0);

        bool shouldSkip = currentVotes >= requiredVotes;

        if (shouldSkip)
        {
            lock (votes) { votes.Clear(); }
            await Clients.Group(roomCode).SendAsync("OnSongSkipped");
        }
        else
        {
            await Clients.Group(roomCode).SendAsync("OnVoteSkipUpdated", new VoteSkipStatusDto
            {
                VotesCount = currentVotes,
                RequiredVotes = requiredVotes,
                Skipped = false
            });
        }
    }
}
