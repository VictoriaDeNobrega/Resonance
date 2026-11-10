namespace Resonance.Api.Models;

public class Song
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Title { get; set; } = string.Empty;
    public string Artist { get; set; } = string.Empty;
    public string Album { get; set; } = string.Empty;
    public string Genre { get; set; } = string.Empty;
    public int DurationInSeconds { get; set; }
    public string AudioUrl { get; set; } = string.Empty;
    public string CoverImageUrl { get; set; } = string.Empty;
    public int PlayCount { get; set; } = 0;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
