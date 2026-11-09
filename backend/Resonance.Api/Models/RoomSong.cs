namespace Resonance.Api.Models;

public class RoomSong
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RoomId { get; set; }
    public string SongId { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Artist { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public int DurationSeconds { get; set; }
    public string AddedBy { get; set; } = string.Empty;
    public int Order { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
}
