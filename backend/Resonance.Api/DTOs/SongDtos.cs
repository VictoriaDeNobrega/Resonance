namespace Resonance.DTOs;

public record SongResponseDto(
    Guid Id,
    string Title,
    string Artist,
    string Album,
    string Genre,
    int DurationInSeconds,
    string AudioUrl,
    string CoverImageUrl,
    int PlayCount
);

public record SongSearchFilterDto(
    string? Query = null,
    string? Genre = null,
    string? SortBy = null,
    int Page = 1,
    int PageSize = 10
);

public record PagedResultDto<T>(
    IEnumerable<T> Items,
    int TotalItems,
    int Page,
    int PageSize,
    int TotalPages
);
