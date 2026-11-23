namespace Resonance.Api.Models;

public class Song
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string? ExternalId { get; set; }
    public string SourceServer { get; set; } = "local";
    public string Title { get; set; } = string.Empty;
    public string Artist { get; set; } = string.Empty;
    public string Album { get; set; } = string.Empty;
    public string Genre { get; set; } = "Alternative Rock";
    public int DurationInSeconds { get; set; }
    public string AudioUrl { get; set; } = string.Empty;
    public string CoverImageUrl { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int PlayCount { get; set; }
    public Guid? UploadedById { get; set; }
    public string UploadedByName { get; set; } = "Resonance";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Propiedades de navegación POO
    public User? UploadedBy { get; set; }
    public ICollection<UserFavoriteSong> FavoritedByUsers { get; set; } = new List<UserFavoriteSong>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<PlaylistSong> PlaylistSongs { get; set; } = new List<PlaylistSong>();
    public ICollection<CommunitySong> CommunitySongs { get; set; } = new List<CommunitySong>();

    public void RegisterPlay()
    {
        PlayCount++;
    }
}
