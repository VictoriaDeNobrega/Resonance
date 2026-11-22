namespace Resonance.Api.Models;

public class CommunityPlaylist
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CommunityId { get; set; }
    public Guid PlaylistId { get; set; }
    public string PlaylistTitle { get; set; } = string.Empty;
    public Guid AddedByUserId { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    public Community Community { get; set; } = null!;
    public Playlist Playlist { get; set; } = null!;
}
