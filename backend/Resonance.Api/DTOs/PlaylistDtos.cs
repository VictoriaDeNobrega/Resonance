namespace Resonance.DTOs;

public record CreatePlaylistDto(
    string Name,
    string? CoverImageUrl = null
);

public record UpdatePlaylistDto(
    string? Name = null,
    string? CoverImageUrl = null
);

public record PlaylistResponseDto(
    Guid Id,
    string UserId,
    string Name,
    string CoverImageUrl,
    DateTime CreatedAt,
    DateTime UpdatedAt
);
