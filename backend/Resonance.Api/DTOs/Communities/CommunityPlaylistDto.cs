namespace Resonance.Api.DTOs.Communities;

public class CommunityPlaylistDto
{
    public Guid Id { get; set; }
    public Guid CommunityId { get; set; }
    public string PlaylistId { get; set; } = string.Empty;
    public string PlaylistTitle { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? CoverUrl { get; set; }
    public int SongCount { get; set; }
    public string AddedBy { get; set; } = string.Empty;
    public DateTime AddedAt { get; set; }
}

