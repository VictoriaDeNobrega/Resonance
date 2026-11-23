using System.Collections.Concurrent;
using System.Text.Json;

namespace Resonance.Api.Models;

public class Room
{
    private static readonly ConcurrentDictionary<Guid, DateTime> LastSyncAtByRoom = new();

    public Guid Id { get; set; } = Guid.NewGuid();
    public string Code { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Genre { get; set; } = "General";
    public bool IsPrivate { get; set; }
    public string? AccessKey { get; set; }
    public int MaxCapacity { get; set; } = 50;
    public Guid HostId { get; set; }
    public string HostName { get; set; } = string.Empty;

    // Estado del reproductor sincronizado en tiempo real (HU 1.7)
    public Guid? CurrentSongId { get; set; }
    public string? CurrentSongTitle { get; set; }
    public string? CurrentSongArtist { get; set; }
    public string? CurrentSongCoverUrl { get; set; }
    public string? CurrentSongUrl { get; set; }
    public long CurrentTimeMs { get; set; }
    public bool IsPlaying { get; set; }
    public bool IsActive { get; set; } = true;
    public int ListenerCount { get; set; }
    public string SkipVoterIdsJson { get; set; } = "[]";
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public User Host { get; set; } = null!;
    public ICollection<RoomSong> Queue { get; set; } = new List<RoomSong>();
    public ICollection<RoomMessage> Messages { get; set; } = new List<RoomMessage>();

    public static string NormalizeCode(string? code) => (code ?? string.Empty).Trim().ToUpperInvariant();

    public bool IsHost(Guid userId) => HostId == userId;

    public bool HasCapacity() => ListenerCount < MaxCapacity;

    public bool ValidateAccessKey(string? providedKey)
    {
        if (!IsPrivate)
        {
            return true;
        }

        return !string.IsNullOrWhiteSpace(AccessKey) &&
               string.Equals(AccessKey, providedKey?.Trim(), StringComparison.Ordinal);
    }

    public List<Guid> GetSkipVoterIds() => DeserializeGuidList(SkipVoterIdsJson);

    public int GetSkipVoteCount() => GetSkipVoterIds().Count;

    public int CalculateRequiredSkipVotes() =>
        Math.Max(1, (int)Math.Ceiling(Math.Max(1, ListenerCount) / 2.0));

    public int ToggleSkipVoter(Guid userId)
    {
        var voters = GetSkipVoterIds();
        if (!voters.Remove(userId))
        {
            voters.Add(userId);
        }

        SkipVoterIdsJson = JsonSerializer.Serialize(voters);
        return voters.Count;
    }

    public void ResetSkipVoters() => SkipVoterIdsJson = "[]";

    public long GetProjectedCurrentTimeMs()
    {
        if (!IsPlaying || !LastSyncAtByRoom.TryGetValue(Id, out var syncedAt))
            return CurrentTimeMs;
        var elapsedMs = (long)Math.Max(0, (DateTime.UtcNow - syncedAt).TotalMilliseconds);
        return CurrentTimeMs + elapsedMs;
    }

    public void ApplyTrack(Song? song)
    {
        CurrentSongId = song?.Id;
        CurrentSongTitle = song?.Title;
        CurrentSongArtist = song?.Artist;
        CurrentSongCoverUrl = song?.CoverImageUrl;
        CurrentSongUrl = song?.AudioUrl;
        CurrentTimeMs = 0;
        IsPlaying = song is not null;
        LastSyncAtByRoom[Id] = DateTime.UtcNow;
        ResetSkipVoters();
    }

    public void ApplyTrack(RoomSong? nextSong)
    {
        CurrentSongId = nextSong?.SongId;
        CurrentSongTitle = nextSong?.Title;
        CurrentSongArtist = nextSong?.Artist;
        CurrentSongCoverUrl = nextSong?.CoverUrl;
        CurrentSongUrl = nextSong?.Url;
        CurrentTimeMs = 0;
        IsPlaying = nextSong is not null;
        LastSyncAtByRoom[Id] = DateTime.UtcNow;
        ResetSkipVoters();
    }

    public void ApplyTrack(Guid? songId, string title, string artist, string coverUrl, string audioUrl, bool isPlaying = true)
    {
        CurrentSongId = songId;
        CurrentSongTitle = title;
        CurrentSongArtist = string.IsNullOrWhiteSpace(artist) ? "Desconocido" : artist;
        CurrentSongCoverUrl = coverUrl;
        CurrentSongUrl = audioUrl;
        CurrentTimeMs = 0;
        IsPlaying = isPlaying;
        LastSyncAtByRoom[Id] = DateTime.UtcNow;
        ResetSkipVoters();
    }

    public void UpdatePlayback(
        string? songUrl,
        string? songTitle,
        string? songArtist,
        string? songCoverUrl,
        long currentTimeMs,
        bool isPlaying,
        bool trackAlreadyChanged = false)
    {
        var trackChanged = trackAlreadyChanged;
        if (!string.IsNullOrWhiteSpace(songUrl))
        {
            var trimmedUrl = songUrl.Trim();
            if (!string.Equals(CurrentSongUrl, trimmedUrl, StringComparison.Ordinal)) trackChanged = true;
            CurrentSongUrl = trimmedUrl;
        }
        if (!string.IsNullOrWhiteSpace(songTitle)) CurrentSongTitle = songTitle.Trim();
        if (!string.IsNullOrWhiteSpace(songArtist)) CurrentSongArtist = songArtist.Trim();
        if (songCoverUrl is not null) CurrentSongCoverUrl = songCoverUrl.Trim();

        CurrentTimeMs = Math.Max(0, currentTimeMs);
        IsPlaying = isPlaying;
        LastSyncAtByRoom[Id] = DateTime.UtcNow;
        if (trackChanged) ResetSkipVoters();
    }

    public RoomSong? SelectNextQueueSong() =>
        Queue.OrderByDescending(q => q.VoteCount)
            .ThenBy(q => q.OrderIndex)
            .ThenBy(q => q.AddedAt)
            .FirstOrDefault();

    public RoomSong? AdvanceToNextTrack()
    {
        var nextSong = SelectNextQueueSong();
        ApplyTrack(nextSong);
        if (nextSong is not null) Queue.Remove(nextSong);
        return nextSong;
    }

    public RoomSong CreateQueueEntry(Guid? songId, string title, string artist, string url, string coverUrl, int durationSeconds, string? requestedBy) => new()
    {
        Id = Guid.NewGuid(),
        RoomId = Id,
        SongId = songId,
        Title = title,
        Artist = string.IsNullOrWhiteSpace(artist) ? "Desconocido" : artist,
        Url = url,
        CoverUrl = coverUrl,
        DurationSeconds = durationSeconds,
        RequestedBy = string.IsNullOrWhiteSpace(requestedBy) ? "Anónimo" : requestedBy.Trim(),
        OrderIndex = Queue.Count > 0 ? Queue.Max(q => q.OrderIndex) + 1 : 0,
        AddedAt = DateTime.UtcNow
    };

    public void Close()
    {
        IsActive = false;
        IsPlaying = false;
        ListenerCount = 0;
        ResetSkipVoters();
    }

    internal static List<Guid> DeserializeGuidList(string? json)
    {
        if (string.IsNullOrWhiteSpace(json))
        {
            return new List<Guid>();
        }

        try
        {
            return JsonSerializer.Deserialize<List<Guid>>(json) ?? new List<Guid>();
        }
        catch
        {
            return new List<Guid>();
        }
    }
}
