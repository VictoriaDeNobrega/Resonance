using System.ComponentModel.DataAnnotations;
using Resonance.Api.Models;

namespace Resonance.Api.DTOs;

public class CreateCommunityDto
{
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public CommunityCategoryType CategoryType { get; set; } = CommunityCategoryType.Genre;
    public string CategoryValue { get; set; } = string.Empty;
    public string CoverImageUrl { get; set; } = string.Empty;
    [Required(ErrorMessage = "El creador de la comunidad es obligatorio.")]
    public Guid CreatorId { get; set; }
    public string? CreatorName { get; set; }
}

public class UpdateCommunityDto
{
    public Guid? UserId { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public CommunityCategoryType CategoryType { get; set; } = CommunityCategoryType.Genre;
    public string CategoryValue { get; set; } = string.Empty;
    public string? CoverImageUrl { get; set; }
}

public class JoinCommunityRequestDto
{
    [Required]
    public Guid UserId { get; set; }
    public string? UserName { get; set; }
}

public class AddCommunityPlaylistDto
{
    [Required]
    public Guid PlaylistId { get; set; }
    [Required]
    public Guid AddedByUserId { get; set; }
}

public class AddCommunitySongDto
{
    [Required]
    public Guid SongId { get; set; }
    [Required]
    public Guid AddedByUserId { get; set; }
}

public class CreateCommunityCommentDto
{
    [Required]
    public Guid AuthorId { get; set; }
    public string? AuthorName { get; set; }
    [Required(ErrorMessage = "El comentario no puede estar vacío."), StringLength(1000, MinimumLength = 1)]
    public string Content { get; set; } = string.Empty;
}

public class CommunityMemberDto
{
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public bool IsCreator { get; set; }
    public DateTime JoinedAt { get; set; }

    public static CommunityMemberDto FromEntity(CommunityMember m, Guid communityCreatorId) => new()
    {
        UserId = m.UserId,
        UserName = m.UserName,
        IsCreator = m.UserId == communityCreatorId,
        JoinedAt = m.JoinedAt
    };
}

public class CommunityPlaylistDto
{
    public Guid Id { get; set; }
    public Guid CommunityId { get; set; }
    public Guid PlaylistId { get; set; }
    public string PlaylistTitle { get; set; } = string.Empty;
    public string AuthorName { get; set; } = string.Empty;
    public string CoverImageUrl { get; set; } = string.Empty;
    public int SongCount { get; set; }
    public Guid AddedByUserId { get; set; }
    public DateTime AddedAt { get; set; }

    public static CommunityPlaylistDto FromEntity(CommunityPlaylist cp, Playlist? playlist = null)
    {
        var source = playlist ?? cp.Playlist;
        return new CommunityPlaylistDto
        {
            Id = cp.Id,
            CommunityId = cp.CommunityId,
            PlaylistId = cp.PlaylistId,
            PlaylistTitle = source?.Name ?? cp.PlaylistTitle,
            AuthorName = source?.AuthorName ?? string.Empty,
            CoverImageUrl = source?.CoverImageUrl ?? string.Empty,
            SongCount = source?.PlaylistSongs?.Count ?? 0,
            AddedByUserId = cp.AddedByUserId,
            AddedAt = cp.AddedAt
        };
    }
}

public class CommunitySongDto
{
    public Guid Id { get; set; }
    public Guid CommunityId { get; set; }
    public Guid SongId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string Artist { get; set; } = string.Empty;
    public string Album { get; set; } = string.Empty;
    public string Genre { get; set; } = string.Empty;
    public int DurationInSeconds { get; set; }
    public string AudioUrl { get; set; } = string.Empty;
    public string CoverImageUrl { get; set; } = string.Empty;
    public Guid AddedByUserId { get; set; }
    public DateTime AddedAt { get; set; }

    public static CommunitySongDto FromEntity(CommunitySong cs, Song? song = null)
    {
        var source = song ?? cs.Song;
        return new CommunitySongDto
        {
            Id = cs.Id,
            CommunityId = cs.CommunityId,
            SongId = cs.SongId,
            Title = source.Title,
            Artist = source.Artist,
            Album = source.Album,
            Genre = source.Genre,
            DurationInSeconds = source.DurationInSeconds,
            AudioUrl = source.AudioUrl,
            CoverImageUrl = source.CoverImageUrl,
            AddedByUserId = cs.AddedByUserId,
            AddedAt = cs.AddedAt
        };
    }
}

public class CommunityCommentDto
{
    public Guid Id { get; set; }
    public Guid CommunityId { get; set; }
    public Guid AuthorId { get; set; }
    public string AuthorName { get; set; } = string.Empty;
    public bool IsOwnerComment { get; set; }
    public string Content { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public static CommunityCommentDto FromEntity(CommunityComment cc, Guid communityCreatorId) => new()
    {
        Id = cc.Id,
        CommunityId = cc.CommunityId,
        AuthorId = cc.AuthorId,
        AuthorName = cc.AuthorName,
        IsOwnerComment = cc.AuthorId == communityCreatorId,
        Content = cc.Content,
        CreatedAt = cc.CreatedAt
    };
}

public class CommunityDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public CommunityCategoryType CategoryType { get; set; }
    public string CategoryValue { get; set; } = string.Empty;
    public string CoverImageUrl { get; set; } = string.Empty;
    public Guid CreatorId { get; set; }
    public string CreatorName { get; set; } = string.Empty;
    public int MemberCount { get; set; }
    public int PlaylistCount { get; set; }
    public int SongCount { get; set; }
    public int CommentCount { get; set; }
    public bool IsMember { get; set; }
    public bool IsCreator { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public static CommunityDto FromEntity(Community c, Guid? userId = null) =>
        PopulateBase(new CommunityDto(), c, userId);

    protected static T PopulateBase<T>(T dto, Community c, Guid? userId) where T : CommunityDto
    {
        dto.Id = c.Id;
        dto.Name = c.Name;
        dto.Description = c.Description;
        dto.CategoryType = c.CategoryType;
        dto.CategoryValue = c.CategoryValue;
        dto.CoverImageUrl = c.CoverImageUrl;
        dto.CreatorId = c.CreatorId;
        dto.CreatorName = c.CreatorName;
        dto.MemberCount = c.Members?.Count ?? 0;
        dto.PlaylistCount = c.CommunityPlaylists?.Count ?? 0;
        dto.SongCount = c.CommunitySongs?.Count ?? 0;
        dto.CommentCount = c.Comments?.Count ?? 0;
        dto.IsMember = userId.HasValue && (c.Members?.Any(m => m.UserId == userId.Value) ?? false);
        dto.IsCreator = userId.HasValue && c.IsOwner(userId.Value);
        dto.CreatedAt = c.CreatedAt;
        dto.UpdatedAt = c.UpdatedAt;
        return dto;
    }
}

public class CommunityDetailDto : CommunityDto
{
    public List<CommunityMemberDto> Members { get; set; } = new();
    public List<CommunityPlaylistDto> Playlists { get; set; } = new();
    public List<CommunitySongDto> Songs { get; set; } = new();
    public List<CommunityCommentDto> Comments { get; set; } = new();

    public new static CommunityDetailDto FromEntity(Community c, Guid? userId = null)
    {
        var detail = PopulateBase(new CommunityDetailDto(), c, userId);
        detail.Members = c.Members.OrderBy(m => m.JoinedAt).Select(m => CommunityMemberDto.FromEntity(m, c.CreatorId)).ToList();
        detail.Playlists = c.CommunityPlaylists.OrderByDescending(cp => cp.AddedAt).Select(cp => CommunityPlaylistDto.FromEntity(cp)).ToList();
        detail.Songs = c.CommunitySongs.OrderByDescending(cs => cs.AddedAt).Select(cs => CommunitySongDto.FromEntity(cs)).ToList();
        detail.Comments = c.Comments.OrderByDescending(cc => cc.CreatedAt).Select(cc => CommunityCommentDto.FromEntity(cc, c.CreatorId)).ToList();
        return detail;
    }
}
