using System.ComponentModel.DataAnnotations;
using Resonance.Api.Models;

namespace Resonance.Api.DTOs;

public class CreateRoomDto
{
    [Required(ErrorMessage = "El título de la sala es obligatorio.")]
    [StringLength(50, MinimumLength = 3, ErrorMessage = "El título de la sala debe tener entre 3 y 50 caracteres.")]
    public string Title { get; set; } = string.Empty;
    [StringLength(80)]
    public string Genre { get; set; } = "General";
    public bool IsPrivate { get; set; }
    [RegularExpression(@"^\d{6}$", ErrorMessage = "La clave de acceso debe contener exactamente 6 dígitos numéricos.")]
    public string? AccessKey { get; set; }
    [Range(2, 50, ErrorMessage = "La capacidad máxima permitida es de 2 a 50 usuarios.")]
    public int MaxCapacity { get; set; } = 50;
    [Required(ErrorMessage = "El identificador del anfitrión es obligatorio.")]
    public Guid HostId { get; set; }
    public string? HostName { get; set; }
    public Guid? InitialSongId { get; set; }
}

public class JoinRoomRequestDto
{
    [Required]
    public Guid UserId { get; set; }
    public string? UserName { get; set; }
    public string? AccessKey { get; set; }
}

public class SyncPlaybackDto
{
    public Guid? SongId { get; set; }
    public string? SongTitle { get; set; }
    public string? SongArtist { get; set; }
    public string? SongCoverUrl { get; set; }
    public string? SongUrl { get; set; }
    public long CurrentTimeMs { get; set; }
    public bool IsPlaying { get; set; }
    public long ServerTimestampUtcMs { get; set; }

    public static SyncPlaybackDto FromRoom(RoomDetailDto room) => new()
    {
        SongId = room.CurrentSongId,
        SongTitle = room.CurrentSongTitle,
        SongArtist = room.CurrentSongArtist,
        SongCoverUrl = room.CurrentSongCoverUrl,
        SongUrl = room.CurrentSongUrl,
        CurrentTimeMs = room.CurrentTimeMs,
        IsPlaying = room.IsPlaying,
        ServerTimestampUtcMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()
    };
}

public class AddRoomSongDto
{
    public Guid? SongId { get; set; }
    public string? Title { get; set; }
    public string? Artist { get; set; }
    public string? Url { get; set; }
    public string? CoverUrl { get; set; }
    public int DurationSeconds { get; set; }
    public string? RequestedBy { get; set; }
}

public class VoteRoomSongRequestDto
{
    [Required]
    public Guid UserId { get; set; }
}

public class SkipVoteResultDto
{
    public string RoomCode { get; set; } = string.Empty;
    public int CurrentVotes { get; set; }
    public int VotesRequired { get; set; }
    public bool TrackSkipped { get; set; }
    public RoomDetailDto? UpdatedRoom { get; set; }
}

public class SendRoomMessageDto
{
    public Guid? SenderId { get; set; }
    [Required(ErrorMessage = "El nombre del remitente es obligatorio."), StringLength(120)]
    public string SenderName { get; set; } = string.Empty;
    [Required(ErrorMessage = "El mensaje no puede estar vacío."), StringLength(1000, MinimumLength = 1)]
    public string Content { get; set; } = string.Empty;
}

public class RoomSongDto
{
    public Guid Id { get; set; }
    public Guid RoomId { get; set; }
    public Guid? SongId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Artist { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string CoverUrl { get; set; } = string.Empty;
    public int DurationSeconds { get; set; }
    public string RequestedBy { get; set; } = string.Empty;
    public int VoteCount { get; set; }
    public List<Guid> VoterIds { get; set; } = new();
    public int OrderIndex { get; set; }
    public DateTime AddedAt { get; set; }

    public static RoomSongDto FromEntity(RoomSong item) => new()
    {
        Id = item.Id,
        RoomId = item.RoomId,
        SongId = item.SongId,
        Title = item.Title,
        Artist = item.Artist,
        Url = item.Url,
        CoverUrl = item.CoverUrl,
        DurationSeconds = item.DurationSeconds,
        RequestedBy = item.RequestedBy,
        VoteCount = item.VoteCount,
        VoterIds = item.GetVoterIds(),
        OrderIndex = item.OrderIndex,
        AddedAt = item.AddedAt
    };
}

public class RoomMessageDto
{
    public Guid Id { get; set; }
    public Guid RoomId { get; set; }
    public Guid? SenderId { get; set; }
    public string SenderName { get; set; } = string.Empty;
    public string Content { get; set; } = string.Empty;
    public DateTime SentAt { get; set; }

    public static RoomMessageDto FromEntity(RoomMessage msg) => new()
    {
        Id = msg.Id,
        RoomId = msg.RoomId,
        SenderId = msg.SenderId,
        SenderName = msg.SenderName,
        Content = msg.Content,
        SentAt = msg.SentAt
    };
}

public class RoomSummaryDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string InviteLink { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Genre { get; set; } = string.Empty;
    public bool IsPrivate { get; set; }
    public string? AccessKey { get; set; }
    public int MaxCapacity { get; set; }
    public Guid HostId { get; set; }
    public string HostName { get; set; } = string.Empty;
    public Guid? CurrentSongId { get; set; }
    public string? CurrentSongTitle { get; set; }
    public string? CurrentSongArtist { get; set; }
    public string? CurrentSongCoverUrl { get; set; }
    public string? CurrentSongUrl { get; set; }
    public long CurrentTimeMs { get; set; }
    public bool IsPlaying { get; set; }
    public bool IsActive { get; set; }
    public int ListenerCount { get; set; }
    public int QueueCount { get; set; }
    public long ServerTimestampUtcMs { get; set; }
    public DateTime CreatedAt { get; set; }

    public static RoomSummaryDto FromEntity(Room room, string frontendUrl, bool includeAccessKey = false) =>
        PopulateBase(new RoomSummaryDto(), room, frontendUrl, includeAccessKey);

    protected static T PopulateBase<T>(T dto, Room room, string frontendUrl, bool includeAccessKey) where T : RoomSummaryDto
    {
        dto.Id = room.Id;
        dto.Code = room.Code;
        dto.InviteLink = $"{frontendUrl.TrimEnd('/')}/home?room={Uri.EscapeDataString(room.Code)}";
        dto.Title = room.Title;
        dto.Genre = room.Genre;
        dto.IsPrivate = room.IsPrivate;
        dto.AccessKey = includeAccessKey ? room.AccessKey : null;
        dto.MaxCapacity = room.MaxCapacity;
        dto.HostId = room.HostId;
        dto.HostName = room.HostName;
        dto.CurrentSongId = room.CurrentSongId;
        dto.CurrentSongTitle = room.CurrentSongTitle;
        dto.CurrentSongArtist = room.CurrentSongArtist;
        dto.CurrentSongCoverUrl = room.CurrentSongCoverUrl;
        dto.CurrentSongUrl = room.CurrentSongUrl;
        dto.CurrentTimeMs = room.GetProjectedCurrentTimeMs();
        dto.IsPlaying = room.IsPlaying;
        dto.IsActive = room.IsActive;
        dto.ListenerCount = room.ListenerCount;
        dto.QueueCount = room.Queue?.Count ?? 0;
        dto.ServerTimestampUtcMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();
        dto.CreatedAt = room.CreatedAt;
        return dto;
    }
}

public class RoomDetailDto : RoomSummaryDto
{
    public int SkipVoteCount { get; set; }
    public int SkipVotesRequired { get; set; }
    public List<RoomSongDto> Queue { get; set; } = new();
    public List<RoomMessageDto> Messages { get; set; } = new();

    public new static RoomDetailDto FromEntity(Room room, string frontendUrl, bool includeAccessKey = false)
    {
        var detail = PopulateBase(new RoomDetailDto(), room, frontendUrl, includeAccessKey);
        detail.Queue = (room.Queue ?? Array.Empty<RoomSong>())
            .OrderByDescending(q => q.VoteCount)
            .ThenBy(q => q.OrderIndex)
            .ThenBy(q => q.AddedAt)
            .Select(RoomSongDto.FromEntity)
            .ToList();
        detail.Messages = (room.Messages ?? Array.Empty<RoomMessage>())
            .OrderBy(m => m.SentAt)
            .TakeLast(100)
            .Select(RoomMessageDto.FromEntity)
            .ToList();
        detail.QueueCount = detail.Queue.Count;
        detail.SkipVoteCount = room.GetSkipVoteCount();
        detail.SkipVotesRequired = room.CalculateRequiredSkipVotes();
        return detail;
    }
}
