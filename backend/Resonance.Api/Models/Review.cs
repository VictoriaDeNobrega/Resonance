namespace Resonance.Api.Models;

public class Review
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid SongId { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Song Song { get; set; } = null!;
    public User User { get; set; } = null!;
}
