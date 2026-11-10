using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace Resonance.Api.Models;

public class CommunityPlaylist
{
    public Guid Id { get; set; } = Guid.NewGuid();

    public Guid CommunityId { get; set; }

    [JsonIgnore]
    public Community? Community { get; set; }

    [Required]
    [MaxLength(100)]
    public string PlaylistId { get; set; } = string.Empty;

    [Required]
    [MaxLength(150)]
    public string PlaylistTitle { get; set; } = string.Empty;

    [MaxLength(300)]
    public string? Description { get; set; }

    [MaxLength(500)]
    public string? CoverUrl { get; set; }

    public int SongCount { get; set; } = 0;

    [MaxLength(100)]
    public string AddedBy { get; set; } = string.Empty;

    public DateTime AddedAt { get; set; } = DateTime.UtcNow;
}

