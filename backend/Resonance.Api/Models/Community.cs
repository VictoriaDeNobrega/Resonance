using System.ComponentModel.DataAnnotations;

namespace Resonance.Api.Models;

public class Community
{
    public Guid Id { get; set; } = Guid.NewGuid();

    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Versión en minúsculas y sin espacios extra para garantizar nombres no repetidos (insensible a mayúsculas/minúsculas).
    /// </summary>
    [Required]
    [MaxLength(100)]
    public string NormalizedName { get; set; } = string.Empty;

    [MaxLength(500)]
    public string Description { get; set; } = string.Empty;

    public CommunityCategoryType CategoryType { get; set; } = CommunityCategoryType.Genre;

    [Required]
    [MaxLength(100)]
    public string CategoryValue { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string CreatorId { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? CreatorName { get; set; }

    [MaxLength(500)]
    public string? BannerUrl { get; set; }

    public int MemberCount { get; set; } = 1;

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public List<CommunityPlaylist> Playlists { get; set; } = new();
}

