namespace Resonance.Api.Models;

public class PlaylistSong
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid PlaylistId { get; set; }
    public Guid SongId { get; set; }
    public int OrderIndex { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    public Playlist Playlist { get; set; } = null!;
    public Song Song { get; set; } = null!;
}
