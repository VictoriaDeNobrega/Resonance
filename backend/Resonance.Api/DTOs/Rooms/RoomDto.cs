using Resonance.Api.Models;

namespace Resonance.Api.DTOs.Rooms;

public class RoomDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string HostId { get; set; } = string.Empty;
    public string? CurrentSongId { get; set; }
    public string? CurrentSongTitle { get; set; }
    public string? CurrentSongArtist { get; set; }
    public string? CurrentSongUrl { get; set; }
    public long CurrentTimeMs { get; set; }
    public bool IsPlaying { get; set; }
    public bool IsActive { get; set; }
    public DateTime CreatedAt { get; set; }
    public List<RoomSong> Queue { get; set; } = new();
}
