namespace Resonance.Api.Models;

public class Community
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string NormalizedName { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public CommunityCategoryType CategoryType { get; set; } = CommunityCategoryType.Genre;
    public string CategoryValue { get; set; } = string.Empty;
    public string CoverImageUrl { get; set; } = string.Empty;
    public Guid CreatorId { get; set; }
    public string CreatorName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User Creator { get; set; } = null!;
    public ICollection<CommunityMember> Members { get; set; } = new List<CommunityMember>();
    public ICollection<CommunityPlaylist> CommunityPlaylists { get; set; } = new List<CommunityPlaylist>();
    public ICollection<CommunitySong> CommunitySongs { get; set; } = new List<CommunitySong>();
    public ICollection<CommunityComment> Comments { get; set; } = new List<CommunityComment>();

    public static string Normalize(string name) => name.Trim().ToLowerInvariant();

    public bool IsOwner(Guid userId) => CreatorId == userId;

    public bool CanModerateComment(CommunityComment comment, Guid requesterId) =>
        IsOwner(requesterId) || comment.AuthorId == requesterId;
}
