namespace Resonance.Api.Models;

public class Playlist
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid UserId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CoverImageUrl { get; set; } = string.Empty;
    public bool IsPublic { get; set; } = true;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;

    public User User { get; set; } = null!;
    public ICollection<PlaylistSong> PlaylistSongs { get; set; } = new List<PlaylistSong>();
    public ICollection<CommunityPlaylist> CommunityPlaylists { get; set; } = new List<CommunityPlaylist>();

    public bool IsOwner(Guid userId) => UserId == userId;

    public void RecalculateSongOrder(IList<Guid>? desiredOrder = null)
    {
        var index = 0;

        if (desiredOrder is { Count: > 0 })
        {
            var bySongId = PlaylistSongs.ToDictionary(ps => ps.SongId);
            var assigned = new HashSet<Guid>();

            foreach (var songId in desiredOrder.Distinct())
            {
                if (bySongId.TryGetValue(songId, out var entry))
                {
                    entry.OrderIndex = index++;
                    assigned.Add(songId);
                }
            }

            foreach (var remaining in PlaylistSongs.Where(ps => !assigned.Contains(ps.SongId)).OrderBy(ps => ps.OrderIndex))
            {
                remaining.OrderIndex = index++;
            }

            return;
        }

        foreach (var item in PlaylistSongs.OrderBy(ps => ps.OrderIndex))
        {
            item.OrderIndex = index++;
        }
    }

    public static bool IsValidCoverUrl(string url)
    {
        if (url.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase) ||
            url.StartsWith("/", StringComparison.Ordinal))
        {
            return true;
        }

        return Uri.TryCreate(url, UriKind.Absolute, out var parsed) &&
               (parsed.Scheme == Uri.UriSchemeHttp || parsed.Scheme == Uri.UriSchemeHttps);
    }
}
