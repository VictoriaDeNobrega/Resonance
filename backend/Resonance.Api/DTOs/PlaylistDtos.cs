using System.ComponentModel.DataAnnotations;
using Resonance.Api.Models;

namespace Resonance.Api.DTOs;

public class CreatePlaylistDto
{
    [Required(ErrorMessage = "El identificador del usuario es obligatorio.")]
    public Guid UserId { get; set; }

    public string? AuthorName { get; set; }

    [Required(ErrorMessage = "El nombre de la playlist es obligatorio.")]
    [StringLength(120, MinimumLength = 1, ErrorMessage = "El nombre debe tener entre 1 y 120 caracteres.")]
    public string Name { get; set; } = string.Empty;

    [StringLength(500)]
    public string Description { get; set; } = string.Empty;

    [StringLength(1000)]
    public string CoverImageUrl { get; set; } = string.Empty;

    public bool IsPublic { get; set; } = true;
}

public class UpdatePlaylistDto
{
    public Guid? UserId { get; set; }
    public string? Name { get; set; }
    public string? Description { get; set; }
    public string? CoverImageUrl { get; set; }
    public bool? IsPublic { get; set; }
}

public class AddSongToPlaylistRequestDto
{
    [Required]
    public Guid SongId { get; set; }
    public Guid? UserId { get; set; }
}

public class ReorderPlaylistSongsDto
{
    public Guid? UserId { get; set; }

    [Required(ErrorMessage = "Debe enviar el nuevo orden de canciones.")]
    public List<Guid> SongIds { get; set; } = new();
}

public class PlaylistSongItemDto
{
    public Guid PlaylistSongId { get; set; }
    public Guid SongId { get; set; }
    public int OrderIndex { get; set; }
    public DateTime AddedAt { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Artist { get; set; } = string.Empty;
    public string Album { get; set; } = string.Empty;
    public string Genre { get; set; } = string.Empty;
    public int DurationInSeconds { get; set; }
    public string AudioUrl { get; set; } = string.Empty;
    public string CoverImageUrl { get; set; } = string.Empty;
    public int PlayCount { get; set; }

    public static PlaylistSongItemDto FromEntity(PlaylistSong ps) => new()
    {
        PlaylistSongId = ps.Id,
        SongId = ps.SongId,
        OrderIndex = ps.OrderIndex,
        AddedAt = ps.AddedAt,
        Title = ps.Song.Title,
        Artist = ps.Song.Artist,
        Album = ps.Song.Album,
        Genre = ps.Song.Genre,
        DurationInSeconds = ps.Song.DurationInSeconds,
        AudioUrl = ps.Song.AudioUrl,
        CoverImageUrl = ps.Song.CoverImageUrl,
        PlayCount = ps.Song.PlayCount
    };
}

public class PlaylistSummaryDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string CoverImageUrl { get; set; } = string.Empty;
    public bool IsPublic { get; set; }
    public int SongCount { get; set; }
    public int TotalDurationSeconds { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public static PlaylistSummaryDto FromEntity(Playlist p) => new()
    {
        Id = p.Id,
        UserId = p.UserId,
        AuthorName = p.AuthorName,
        Name = p.Name,
        Description = p.Description,
        CoverImageUrl = p.CoverImageUrl,
        IsPublic = p.IsPublic,
        SongCount = p.PlaylistSongs?.Count ?? 0,
        TotalDurationSeconds = p.PlaylistSongs?.Sum(ps => ps.Song?.DurationInSeconds ?? 0) ?? 0,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt
    };
}

public class PlaylistDetailDto : PlaylistSummaryDto
{
    public List<PlaylistSongItemDto> Songs { get; set; } = new();

    public new static PlaylistDetailDto FromEntity(Playlist p)
    {
        var songs = (p.PlaylistSongs ?? Array.Empty<PlaylistSong>())
            .OrderBy(ps => ps.OrderIndex)
            .Select(PlaylistSongItemDto.FromEntity)
            .ToList();

        return new PlaylistDetailDto
        {
            Id = p.Id,
            UserId = p.UserId,
            AuthorName = p.AuthorName,
            Name = p.Name,
            Description = p.Description,
            CoverImageUrl = p.CoverImageUrl,
            IsPublic = p.IsPublic,
            SongCount = songs.Count,
            TotalDurationSeconds = songs.Sum(s => s.DurationInSeconds),
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt,
            Songs = songs
        };
    }
}
