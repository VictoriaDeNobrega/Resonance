namespace Resonance.Api.Models;

public class Room
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string HostId { get; set; } = string.Empty;
    public string? CurrentSongId { get; set; }
    public string? CurrentSongTitle { get; set; }
    public string? CurrentSongArtist { get; set; }
    public string? CurrentSongUrl { get; set; }
    public long CurrentTimeMs { get; set; } = 0;
    public bool IsPlaying { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public List<RoomSong> Queue { get; set; } = new();
}
