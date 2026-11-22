namespace Resonance.Api.Models;

public class CommunitySong
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CommunityId { get; set; }
    public Guid SongId { get; set; }
    public Guid AddedByUserId { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    public Community Community { get; set; } = null!;
    public Song Song { get; set; } = null!;
}
