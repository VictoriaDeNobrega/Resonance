using Resonance.Api.Models;

namespace Resonance.Api.DTOs;

public class MusicServerEndpointStatusDto
{
    public string Name { get; set; } = string.Empty;
    public string BaseUrl { get; set; } = string.Empty;
    public bool IsOnline { get; set; }
    public string? ServerType { get; set; }
    public string? ServerVersion { get; set; }
    public long LatencyMs { get; set; }
    public string? Error { get; set; }
}

public class MusicServerStatusDto
{
    public string ActiveServerUrl { get; set; } = string.Empty;
    public bool FailoverActive { get; set; }
    public int FailoverTimeoutMs { get; set; } = 2500;
    public string Username { get; set; } = string.Empty;
    public string ApiVersion { get; set; } = string.Empty;
    public int SyncedSongsInDatabase { get; set; }
    public int TotalSongsInDatabase { get; set; }
    public MusicServerEndpointStatusDto Primary { get; set; } = new();
    public MusicServerEndpointStatusDto Mobile { get; set; } = new();
    public DateTime CheckedAtUtc { get; set; } = DateTime.UtcNow;
}

public class MusicServerSyncResultDto
{
    public bool Success { get; set; }
    public string SourceUsed { get; set; } = string.Empty;
    public bool UsedFallback { get; set; }
    public int FetchedFromServer { get; set; }
    public int AddedCount { get; set; }
    public int UpdatedCount { get; set; }
    public int TotalCatalogCount { get; set; }
    public long ElapsedMs { get; set; }
    public string Message { get; set; } = string.Empty;
}

public sealed record SubsonicTrackDto(
    string ExternalId,
    string Title,
    string Artist,
    string Album,
    string Genre,
    int DurationInSeconds,
    string AudioUrl,
    string CoverImageUrl,
    string Description,
    int InitialPlayCount);

public class ClusterNodeStatusDto
{
    public string NodeRole { get; set; } = "primary";
    public string SelfPublicUrl { get; set; } = "https://movil.res0nance.pp.ua";
    public string PeerPublicUrl { get; set; } = "https://musica.res0nance.pp.ua";
    public bool PeerOnline { get; set; }
    public long PeerLatencyMs { get; set; }
    public bool FailoverActive { get; set; }
    public int FailoverTimeoutMs { get; set; } = 2500;
    public DateTime? LastSyncAtUtc { get; set; }
    public string LastSyncMessage { get; set; } = "Sin sincronización previa.";
}

public class ClusterSyncResultDto
{
    public bool Success { get; set; }
    public string NodeRole { get; set; } = string.Empty;
    public string PeerUrl { get; set; } = string.Empty;
    public int UsersMerged { get; set; }
    public int SongsMerged { get; set; }
    public int PlaylistsMerged { get; set; }
    public int CommunitiesMerged { get; set; }
    public int RoomsMerged { get; set; }
    public long ElapsedMs { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class ClusterDatabaseSnapshotDto
{
    public string SourceNodeUrl { get; set; } = string.Empty;
    public DateTime ExportedAtUtc { get; set; } = DateTime.UtcNow;
    public List<User> Users { get; set; } = new();
    public List<Song> Songs { get; set; } = new();
    public List<UserFavoriteSong> UserFavoriteSongs { get; set; } = new();
    public List<Review> Reviews { get; set; } = new();
    public List<Playlist> Playlists { get; set; } = new();
    public List<PlaylistSong> PlaylistSongs { get; set; } = new();
    public List<Community> Communities { get; set; } = new();
    public List<CommunityMember> CommunityMembers { get; set; } = new();
    public List<CommunityPlaylist> CommunityPlaylists { get; set; } = new();
    public List<CommunitySong> CommunitySongs { get; set; } = new();
    public List<CommunityComment> CommunityComments { get; set; } = new();
    public List<Room> Rooms { get; set; } = new();
    public List<RoomSong> RoomSongs { get; set; } = new();
    public List<RoomMessage> RoomMessages { get; set; } = new();
}
