using Resonance.Api.Data;
using Resonance.Api.DTOs;

namespace Resonance.Api.Services;

public class SearchService : ISearchService
{
    private readonly SongRepository _songRepository;
    private readonly PlaylistRepository _playlistRepository;
    private readonly UserRepository _userRepository;
    private readonly CommunityRepository _communityRepository;

    public SearchService(
        SongRepository songRepository,
        PlaylistRepository playlistRepository,
        UserRepository userRepository,
        CommunityRepository communityRepository)
    {
        _songRepository = songRepository;
        _playlistRepository = playlistRepository;
        _userRepository = userRepository;
        _communityRepository = communityRepository;
    }

    public async Task<GlobalSearchResultDto> GlobalSearchAsync(
        string? query,
        string? genre = null,
        string? artist = null,
        string? filter = "all",
        Guid? userId = null,
        CancellationToken ct = default)
    {
        var normalizedQuery = query?.Trim() ?? string.Empty;
        var normalizedFilter = string.IsNullOrWhiteSpace(filter) ? "all" : filter.Trim().ToLowerInvariant();

        var result = new GlobalSearchResultDto
        {
            Query = normalizedQuery,
            Filter = normalizedFilter
        };

        // 1. Canciones (búsqueda por prefijo + filtros opcionales género/artista — HU 1.3)
        if (normalizedFilter is "all" or "songs")
        {
            var (matchingSongs, _) = await _songRepository.SearchPagedAsync(
                normalizedQuery,
                genre,
                artist,
                page: 1,
                pageSize: 30,
                ct);

            result.Songs = matchingSongs
                .Select(s => SongDto.FromEntity(s, userId))
                .ToList();
        }

        // 2. Playlists públicas (búsqueda por prefijo)
        if (normalizedFilter is "all" or "playlists")
        {
            var matchingPlaylists = await _playlistRepository.GetPublicAsync(
                excludeUserId: null,
                search: normalizedQuery,
                limit: 20,
                ct);

            result.Playlists = matchingPlaylists
                .Select(PlaylistSummaryDto.FromEntity)
                .ToList();
        }

        // 3. Usuarios (búsqueda por prefijo)
        if (normalizedFilter is "all" or "users")
        {
            result.Users = await _userRepository.SearchByPrefixAsync(
                normalizedQuery,
                limit: 20,
                ct);
        }

        // 4. Comunidades (búsqueda por prefijo + filtro opcional por género)
        if (normalizedFilter is "all" or "communities")
        {
            var matchingCommunities = await _communityRepository.GetFilteredAsync(
                search: normalizedQuery,
                categoryType: null,
                categoryValue: genre,
                limit: 20,
                orderByMembersDesc: false,
                ct);

            result.Communities = matchingCommunities
                .Select(c => CommunityDto.FromEntity(c, userId))
                .ToList();
        }

        return result;
    }
}
