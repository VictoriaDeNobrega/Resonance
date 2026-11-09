namespace Resonance.Api.DTOs.Rooms;

public class SyncPlaybackDto
{
    public string RoomCode { get; set; } = string.Empty;
    public string? SongId { get; set; }
    public string? SongTitle { get; set; }
    public string? SongArtist { get; set; }
    public string? SongUrl { get; set; }
    public long CurrentTimeMs { get; set; }
    public bool IsPlaying { get; set; }
}

public class ChatMessageDto
{
    public string RoomCode { get; set; } = string.Empty;
    public string SenderName { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
    public string Timestamp { get; set; } = DateTime.UtcNow.ToString("o");
}

public class VoteSkipDto
{
    public string RoomCode { get; set; } = string.Empty;
    public string UserName { get; set; } = string.Empty;
}

public class VoteSkipStatusDto
{
    public int VotesCount { get; set; }
    public int RequiredVotes { get; set; }
    public bool Skipped { get; set; }
}
