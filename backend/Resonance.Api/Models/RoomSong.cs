using System.Text.Json;

namespace Resonance.Api.Models;

public class RoomSong
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public Guid RoomId { get; set; }
    public Guid? SongId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Artist { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string CoverUrl { get; set; } = string.Empty;
    public int DurationSeconds { get; set; }
    public string RequestedBy { get; set; } = "Anónimo";
    public int VoteCount { get; set; }
    public string VoterIdsJson { get; set; } = "[]";
    public int OrderIndex { get; set; }
    public DateTime AddedAt { get; set; } = DateTime.UtcNow;

    public Room Room { get; set; } = null!;

    public List<Guid> GetVoterIds() => Room.DeserializeGuidList(VoterIdsJson);

    public int ToggleVoter(Guid userId)
    {
        var voters = GetVoterIds();
        if (!voters.Remove(userId))
        {
            voters.Add(userId);
        }

        VoterIdsJson = JsonSerializer.Serialize(voters);
        VoteCount = voters.Count;
        return VoteCount;
    }
}
