namespace Resonance.Api.DTOs.Communities;

public class CommunityDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CategoryType { get; set; } = "Genre"; // "Genre" o "Artist"
    public string CategoryValue { get; set; } = string.Empty;
    public string CreatorId { get; set; } = string.Empty;
    public string? CreatorName { get; set; }
    public string? BannerUrl { get; set; }
    public int MemberCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public List<CommunityPlaylistDto> Playlists { get; set; } = new();
}

