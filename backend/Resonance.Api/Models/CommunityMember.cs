namespace Resonance.Api.Models;

public class CommunityMember
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid CommunityId { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public DateTime JoinedAt { get; set; } = DateTime.UtcNow;

    public Community Community { get; set; } = null!;
    public User User { get; set; } = null!;
}
