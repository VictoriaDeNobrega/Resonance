using Resonance.Api.DTOs;

namespace Resonance.Api.Services;

public interface ISearchService
{
    Task<GlobalSearchResultDto> GlobalSearchAsync(
        string? query,
        string? genre = null,
        string? artist = null,
        string? filter = "all",
        Guid? userId = null,
        CancellationToken ct = default);
}
