using System.ComponentModel.DataAnnotations;
using Resonance.Api.Models;

namespace Resonance.Api.DTOs;

public class SongDto
{
    public Guid Id { get; set; }
    public string? ExternalId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Artist { get; set; } = string.Empty;
    public string Album { get; set; } = string.Empty;
    public string Genre { get; set; } = string.Empty;
    public int DurationInSeconds { get; set; }
    public string AudioUrl { get; set; } = string.Empty;
    public string CoverImageUrl { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public int PlayCount { get; set; }
    public Guid? UploadedById { get; set; }
    public string UploadedByName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public double AverageRating { get; set; }
    public int ReviewCount { get; set; }
    public int FavoriteCount { get; set; }
    public bool IsFavorite { get; set; }

    public static SongDto FromEntity(Song song, Guid? userId = null) => PopulateBase(new SongDto(), song, userId);

    protected static T PopulateBase<T>(T dto, Song song, Guid? userId) where T : SongDto
    {
        var reviewCount = song.Reviews?.Count ?? 0;
        dto.Id = song.Id;
        dto.ExternalId = song.ExternalId;
        dto.Title = song.Title;
        dto.Artist = song.Artist;
        dto.Album = song.Album;
        dto.Genre = song.Genre;
        dto.DurationInSeconds = song.DurationInSeconds;
        dto.AudioUrl = song.AudioUrl;
        dto.CoverImageUrl = song.CoverImageUrl;
        dto.Description = song.Description;
        dto.PlayCount = song.PlayCount;
        dto.UploadedById = song.UploadedById;
        dto.UploadedByName = song.UploadedByName;
        dto.CreatedAt = song.CreatedAt;
        dto.AverageRating = reviewCount > 0 ? Math.Round(song.Reviews!.Average(r => r.Rating), 2) : 0.0;
        dto.ReviewCount = reviewCount;
        dto.FavoriteCount = song.FavoritedByUsers?.Count ?? 0;
        dto.IsFavorite = userId.HasValue && (song.FavoritedByUsers?.Any(f => f.UserId == userId.Value) ?? false);
        return dto;
    }
}

public class SongDetailDto : SongDto
{
    public int PlaylistsContainingCount { get; set; }
    public int CommunitiesContainingCount { get; set; }
    public List<ReviewDto> Reviews { get; set; } = new();

    public new static SongDetailDto FromEntity(Song song, Guid? userId = null)
    {
        var detail = PopulateBase(new SongDetailDto(), song, userId);
        detail.PlaylistsContainingCount = song.PlaylistSongs?.Count ?? 0;
        detail.CommunitiesContainingCount = song.CommunitySongs?.Count ?? 0;
        detail.Reviews = (song.Reviews ?? Array.Empty<Review>())
            .OrderByDescending(r => r.CreatedAt)
            .Select(ReviewDto.FromEntity)
            .ToList();
        return detail;
    }
}

public class CreateSongDto
{
    [Required(ErrorMessage = "El título de la canción es obligatorio."), StringLength(200)]
    public string Title { get; set; } = string.Empty;
    [Required(ErrorMessage = "El artista es obligatorio."), StringLength(200)]
    public string Artist { get; set; } = string.Empty;
    [StringLength(200)]
    public string Album { get; set; } = string.Empty;
    [Required(ErrorMessage = "El género es obligatorio."), StringLength(100)]
    public string Genre { get; set; } = string.Empty;
    [Range(0, 7200, ErrorMessage = "La duración debe estar entre 0 y 7200 segundos.")]
    public int DurationInSeconds { get; set; }
    [Required(ErrorMessage = "La URL de audio es obligatoria."), StringLength(1000)]
    public string AudioUrl { get; set; } = string.Empty;
    [StringLength(1000)]
    public string CoverImageUrl { get; set; } = string.Empty;
    [StringLength(1000)]
    public string Description { get; set; } = string.Empty;
    public Guid? UploadedById { get; set; }
    public string? UploadedByName { get; set; }
}

public class UpdateSongDto
{
    public string? Title { get; set; }
    public string? Artist { get; set; }
    public string? Album { get; set; }
    public string? Genre { get; set; }
    public int? DurationInSeconds { get; set; }
    public string? AudioUrl { get; set; }
    public string? CoverImageUrl { get; set; }
    public string? Description { get; set; }
}

public class ReviewDto
{
    public Guid Id { get; set; }
    public Guid SongId { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public int Rating { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public static ReviewDto FromEntity(Review review) => new()
    {
        Id = review.Id,
        SongId = review.SongId,
        UserId = review.UserId,
        UserName = review.UserName,
        Rating = review.Rating,
        Content = review.Content,
        CreatedAt = review.CreatedAt
    };
}

public class CreateReviewDto
{
    [Required]
    public Guid UserId { get; set; }
    public string? UserName { get; set; }
    [Range(1, 5, ErrorMessage = "La calificación debe estar entre 1 y 5 estrellas.")]
    public int Rating { get; set; }
    [Required(ErrorMessage = "El contenido de la reseña es obligatorio."), StringLength(1000, MinimumLength = 2)]
    public string Content { get; set; } = string.Empty;
}

public class FavoriteToggleRequestDto
{
    [Required]
    public Guid UserId { get; set; }
}

public class FavoriteToggleResponseDto
{
    public Guid SongId { get; set; }
    public Guid UserId { get; set; }
    public bool IsFavorite { get; set; }
    public int FavoriteCount { get; set; }
}

public class PlaySongRequestDto
{
    public Guid? UserId { get; set; }
}

public class HomeSongsResponseDto
{
    public SongDto? FeaturedSong { get; set; }
    public List<SongDto> TrendingSongs { get; set; } = new();
    public List<SongDto> RecentSongs { get; set; } = new();
    public List<SongDto> AllSongs { get; set; } = new();
    public List<string> Genres { get; set; } = new();
    public int TotalSongs { get; set; }
    public long TotalPlays { get; set; }
}

public class GlobalSearchResultDto
{
    public string Query { get; set; } = string.Empty;
    public string Filter { get; set; } = "all";
    public List<SongDto> Songs { get; set; } = new();
    public List<PlaylistSummaryDto> Playlists { get; set; } = new();
    public List<UserSearchItemDto> Users { get; set; } = new();
    public List<CommunityDto> Communities { get; set; } = new();
}

public class PagedSongsResultDto
{
    public List<SongDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
}

public class GenreStatDto
{
    public string Genre { get; set; } = string.Empty;
    public int SongCount { get; set; }
    public long TotalPlays { get; set; }
}

public class ArtistStatDto
{
    public string Artist { get; set; } = string.Empty;
    public int SongCount { get; set; }
    public long TotalPlays { get; set; }
}

public class PlaybackStatsDto
{
    public int TotalSongs { get; set; }
    public long TotalPlays { get; set; }
    public int TotalFavorites { get; set; }
    public int TotalReviews { get; set; }
    public double GlobalAverageRating { get; set; }
    public List<SongDto> TopSongs { get; set; } = new();
    public List<GenreStatDto> PlaysByGenre { get; set; } = new();
    public List<ArtistStatDto> TopArtists { get; set; } = new();
}

public class SongStatsDto
{
    public Guid SongId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Artist { get; set; } = string.Empty;
    public string Genre { get; set; } = string.Empty;
    public int PlayCount { get; set; }
    public int FavoriteCount { get; set; }
    public int ReviewCount { get; set; }
    public double AverageRating { get; set; }
    public int PlaylistsCount { get; set; }
    public int CommunitiesCount { get; set; }

    public static SongStatsDto FromEntity(Song song) => new()
    {
        SongId = song.Id,
        Title = song.Title,
        Artist = song.Artist,
        Genre = song.Genre,
        PlayCount = song.PlayCount,
        FavoriteCount = song.FavoritedByUsers?.Count ?? 0,
        ReviewCount = song.Reviews?.Count ?? 0,
        AverageRating = (song.Reviews?.Count ?? 0) > 0 ? Math.Round(song.Reviews!.Average(r => r.Rating), 2) : 0.0,
        PlaylistsCount = song.PlaylistSongs?.Count ?? 0,
        CommunitiesCount = song.CommunitySongs?.Count ?? 0
    };
}
