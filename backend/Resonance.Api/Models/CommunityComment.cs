namespace Resonance.Api.Models;

public class CommunityComment
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CommunityId { get; set; }
    public Guid AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Community Community { get; set; } = null!;
    public User Author { get; set; } = null!;
}
