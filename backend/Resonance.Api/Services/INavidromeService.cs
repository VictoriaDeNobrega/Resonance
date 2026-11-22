using Resonance.Api.DTOs;

namespace Resonance.Api.Services;

public interface INavidromeService
{
    string PrimaryUrl { get; }
    string BuildAuthQuery(bool includeJsonFormat = false);
    Task<MusicServerEndpointStatusDto> PingServerAsync(string name, string baseUrl, CancellationToken ct = default);
    Task<List<SubsonicTrackDto>> FetchCatalogAsync(string baseUrl, int maxSongs = 100, bool cleanArtistsOnly = false, CancellationToken ct = default);
    Task<MusicServerStatusDto> GetMusicServerStatusAsync(CancellationToken ct = default);
    Task<MusicServerSyncResultDto> SyncWithMusicServerAsync(string source = "primary", CancellationToken ct = default);
}
