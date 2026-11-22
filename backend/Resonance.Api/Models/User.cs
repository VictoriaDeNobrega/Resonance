namespace Resonance.Api.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public string Bio { get; set; } = string.Empty;
    public bool IsConfirmed { get; set; }
    public string? ConfirmationToken { get; set; }

    // Persistencia de sesión y estado de interfaz (HU 2.1)
    public Guid? LastPlayedSongId { get; set; }
    public long LastPlaybackPositionMs { get; set; }
    public double PreferredVolume { get; set; } = 0.8;
    public string ActiveView { get; set; } = "discover";
    public string? ActiveRoomCode { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    // Propiedades de navegación POO
    public Song? LastPlayedSong { get; set; }
    public ICollection<Song> UploadedSongs { get; set; } = new List<Song>();
    public ICollection<UserFavoriteSong> FavoriteSongs { get; set; } = new List<UserFavoriteSong>();
    public ICollection<Review> Reviews { get; set; } = new List<Review>();
    public ICollection<Playlist> Playlists { get; set; } = new List<Playlist>();
    public ICollection<Community> CreatedCommunities { get; set; } = new List<Community>();
    public ICollection<CommunityMember> CommunityMemberships { get; set; } = new List<CommunityMember>();
    public ICollection<CommunityComment> CommunityComments { get; set; } = new List<CommunityComment>();
    public ICollection<Room> HostedRooms { get; set; } = new List<Room>();

    public void UpdateSessionState(
        Guid? lastPlayedSongId,
        long? lastPlaybackPositionMs,
        double? preferredVolume,
        string? activeView,
        string? activeRoomCode,
        bool clearActiveRoom = false)
    {
        if (lastPlayedSongId.HasValue)
        {
            LastPlayedSongId = lastPlayedSongId.Value == Guid.Empty ? null : lastPlayedSongId;
        }

        if (lastPlaybackPositionMs.HasValue)
        {
            LastPlaybackPositionMs = Math.Max(0, lastPlaybackPositionMs.Value);
        }

        if (preferredVolume.HasValue)
        {
            PreferredVolume = Math.Clamp(preferredVolume.Value, 0.0, 1.0);
        }

        if (!string.IsNullOrWhiteSpace(activeView))
        {
            ActiveView = activeView.Trim();
        }

        if (clearActiveRoom)
        {
            ActiveRoomCode = null;
        }
        else if (activeRoomCode is not null)
        {
            ActiveRoomCode = string.IsNullOrWhiteSpace(activeRoomCode)
                ? null
                : activeRoomCode.Trim().ToUpperInvariant();
        }
    }
}
