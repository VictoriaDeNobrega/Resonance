using System.Diagnostics;
using System.Text.Json;
using Resonance.Api.Data;
using Resonance.Api.DTOs;

namespace Resonance.Api.Services;

public class NavidromeService : INavidromeService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly SongRepository _songRepository;
    private readonly ILogger<NavidromeService> _logger;
    private readonly string _primaryUrl;
    private readonly string _mobileUrl;
    private readonly int _failoverTimeoutMs;
    private readonly string _username;
    private readonly string _password;
    private readonly string _apiVersion;
    private readonly string _clientName;

    public NavidromeService(
        IHttpClientFactory httpClientFactory,
        SongRepository songRepository,
        IConfiguration configuration,
        ILogger<NavidromeService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _songRepository = songRepository;
        _logger = logger;

        var section = configuration.GetSection("MusicServer");
        _primaryUrl = (section["PrimaryUrl"] ?? "https://movil.res0nance.pp.ua").TrimEnd('/');
        _mobileUrl = (section["MobileUrl"] ?? "https://musica.res0nance.pp.ua").TrimEnd('/');
        _failoverTimeoutMs = int.TryParse(section["FailoverTimeoutMs"], out var tms) && tms >= 500 ? tms : 2500;
        _username = section["Username"] ?? "Nidus";
        _password = section["Password"] ?? "115r935m";
        _apiVersion = section["ApiVersion"] ?? "1.16.1";
        _clientName = section["ClientName"] ?? "Resonance";
    }

    public string PrimaryUrl => _primaryUrl;

    public string BuildAuthQuery(bool includeJsonFormat = false)
    {
        var query = $"u={Uri.EscapeDataString(_username)}&p={Uri.EscapeDataString(_password)}&v={Uri.EscapeDataString(_apiVersion)}&c={Uri.EscapeDataString(_clientName)}";
        return includeJsonFormat ? $"{query}&f=json" : query;
    }

    public async Task<MusicServerStatusDto> GetMusicServerStatusAsync(CancellationToken ct = default)
    {
        var primaryTask = PingServerAsync("Principal (Resonance Móvil)", _primaryUrl, ct);
        var mobileTask = PingServerAsync("Secundario (Música Resonance Failover)", _mobileUrl, ct);
        await Task.WhenAll(primaryTask, mobileTask);

        var primary = primaryTask.Result;
        var mobile = mobileTask.Result;
        var (syncedCount, totalCount) = await _songRepository.GetCatalogCountsAsync(ct);
        var primaryHealthy = primary.IsOnline && primary.LatencyMs <= _failoverTimeoutMs;

        return new MusicServerStatusDto
        {
            ActiveServerUrl = primaryHealthy ? _primaryUrl : (mobile.IsOnline ? _mobileUrl : _primaryUrl),
            FailoverActive = !primaryHealthy && mobile.IsOnline,
            FailoverTimeoutMs = _failoverTimeoutMs,
            Username = _username,
            ApiVersion = _apiVersion,
            SyncedSongsInDatabase = syncedCount,
            TotalSongsInDatabase = totalCount,
            Primary = primary,
            Mobile = mobile,
            CheckedAtUtc = DateTime.UtcNow
        };
    }

    public async Task<MusicServerSyncResultDto> SyncWithMusicServerAsync(string source = "primary", CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        var normalized = string.IsNullOrWhiteSpace(source) ? "primary" : source.Trim().ToLowerInvariant();
        var fetched = new List<SubsonicTrackDto>();
        var usedFallback = false;
        var sourceUsed = _primaryUrl;

        try
        {
            if (normalized is "mobile" or "secondary")
            {
                sourceUsed = _mobileUrl;
                fetched = await FetchCatalogAsync(_mobileUrl, 100, cleanArtistsOnly: false, ct);
            }
            else if (normalized == "both")
            {
                var primaryTracks = await FetchWithTimeoutAsync(_primaryUrl, 100, cleanArtistsOnly: true, ct);
                var secondaryTracks = await FetchCatalogAsync(_mobileUrl, 100, cleanArtistsOnly: false, ct);
                fetched = primaryTracks.Concat(secondaryTracks).DistinctBy(t => t.ExternalId).ToList();
                sourceUsed = $"{_primaryUrl} + {_mobileUrl}";
            }
            else
            {
                fetched = await FetchWithTimeoutAsync(_primaryUrl, 100, cleanArtistsOnly: true, ct);
                if (fetched.Count == 0)
                {
                    _logger.LogWarning("Servidor principal {PrimaryUrl} sin pistas o excedió {Timeout}ms; conmutando al secundario {MobileUrl}.", _primaryUrl, _failoverTimeoutMs, _mobileUrl);
                    fetched = await FetchCatalogAsync(_mobileUrl, 100, cleanArtistsOnly: false, ct);
                    usedFallback = true;
                    sourceUsed = _mobileUrl;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Timeout/Fallo en servidor principal {PrimaryUrl} (>{Timeout}ms); activando failover a {MobileUrl}.", _primaryUrl, _failoverTimeoutMs, _mobileUrl);
            try
            {
                fetched = await FetchCatalogAsync(_mobileUrl, 100, cleanArtistsOnly: false, ct);
                usedFallback = true;
                sourceUsed = _mobileUrl;
            }
            catch (Exception fallbackEx)
            {
                _logger.LogError(fallbackEx, "Error consultando servidor secundario {MobileUrl}.", _mobileUrl);
                sw.Stop();
                return new MusicServerSyncResultDto
                {
                    Success = false, SourceUsed = sourceUsed, UsedFallback = true,
                    TotalCatalogCount = await _songRepository.CountAsync(ct),
                    ElapsedMs = sw.ElapsedMilliseconds,
                    Message = $"No se pudo conectar al servidor principal ni al secundario: {fallbackEx.Message}"
                };
            }
        }

        var (added, updated, total) = await _songRepository.UpsertSubsonicCatalogAsync(fetched, _username, ct);
        sw.Stop();
        return new MusicServerSyncResultDto
        {
            Success = fetched.Count > 0, SourceUsed = sourceUsed, UsedFallback = usedFallback,
            FetchedFromServer = fetched.Count, AddedCount = added, UpdatedCount = updated,
            TotalCatalogCount = total, ElapsedMs = sw.ElapsedMilliseconds,
            Message = fetched.Count > 0
                ? $"Sincronización completada desde {sourceUsed} (Failover={usedFallback}): {added} agregadas, {updated} actualizadas."
                : $"El servidor {sourceUsed} no devolvió pistas disponibles."
        };
    }

    public async Task<MusicServerEndpointStatusDto> PingServerAsync(string name, string baseUrl, CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(_failoverTimeoutMs);

        try
        {
            using var response = await _httpClientFactory.CreateClient("Subsonic").GetAsync($"{baseUrl}/rest/ping.view?{BuildAuthQuery(true)}", timeoutCts.Token);
            sw.Stop();
            if (!response.IsSuccessStatusCode)
                return OfflineStatus(name, baseUrl, sw.ElapsedMilliseconds, $"HTTP {(int)response.StatusCode}");

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(timeoutCts.Token));
            if (!doc.RootElement.TryGetProperty("subsonic-response", out var subsonic))
                return OfflineStatus(name, baseUrl, sw.ElapsedMilliseconds, "Respuesta JSON sin nodo subsonic-response.");

            var isOk = string.Equals(GetString(subsonic, "status"), "ok", StringComparison.OrdinalIgnoreCase);
            return new MusicServerEndpointStatusDto
            {
                Name = name, BaseUrl = baseUrl, IsOnline = isOk,
                ServerType = GetString(subsonic, "type") ?? "subsonic",
                ServerVersion = GetString(subsonic, "serverVersion") ?? _apiVersion,
                LatencyMs = sw.ElapsedMilliseconds, Error = isOk ? null : "Subsonic respondió con error."
            };
        }
        catch (OperationCanceledException) when (!ct.IsCancellationRequested)
        {
            sw.Stop();
            return OfflineStatus(name, baseUrl, sw.ElapsedMilliseconds, $"Timeout > {_failoverTimeoutMs}ms");
        }
        catch (Exception ex)
        {
            sw.Stop();
            return OfflineStatus(name, baseUrl, sw.ElapsedMilliseconds, ex.Message);
        }
    }

    private async Task<List<SubsonicTrackDto>> FetchWithTimeoutAsync(string baseUrl, int maxSongs, bool cleanArtistsOnly, CancellationToken ct)
    {
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(_failoverTimeoutMs);
        return await FetchCatalogAsync(baseUrl, maxSongs, cleanArtistsOnly, timeoutCts.Token);
    }

    public async Task<List<SubsonicTrackDto>> FetchCatalogAsync(string baseUrl, int maxSongs = 100, bool cleanArtistsOnly = false, CancellationToken ct = default)
    {
        var client = _httpClientFactory.CreateClient("Subsonic");
        var auth = BuildAuthQuery(true);
        var tracks = await FetchEndpointAsync(client, baseUrl, $"{baseUrl}/rest/search3.view?query=&songCount={maxSongs}&{auth}", "searchResult3", cleanArtistsOnly, ct);
        return tracks.Count > 0 ? tracks : await FetchEndpointAsync(client, baseUrl, $"{baseUrl}/rest/getRandomSongs.view?size={maxSongs}&{auth}", "randomSongs", cleanArtistsOnly, ct);
    }

    private async Task<List<SubsonicTrackDto>> FetchEndpointAsync(
        HttpClient client, string baseUrl, string requestUrl, string containerProp, bool cleanArtistsOnly, CancellationToken ct)
    {
        var result = new List<SubsonicTrackDto>();
        using var response = await client.GetAsync(requestUrl, ct);
        if (!response.IsSuccessStatusCode) return result;

        using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(ct));
        if (!doc.RootElement.TryGetProperty("subsonic-response", out var sub) ||
            !string.Equals(GetString(sub, "status"), "ok", StringComparison.OrdinalIgnoreCase) ||
            !sub.TryGetProperty(containerProp, out var container) ||
            !container.TryGetProperty("song", out var songArray) ||
            songArray.ValueKind != JsonValueKind.Array)
            return result;

        var streamAuth = BuildAuthQuery(false);
        var seen = new HashSet<string>(StringComparer.Ordinal);
        var idx = 0;

        foreach (var item in songArray.EnumerateArray())
        {
            var id = GetString(item, "id");
            var title = GetString(item, "title")?.Trim();
            if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(title) || !seen.Add(id)) continue;

            var rawArtist = GetString(item, "artist")?.Trim();
            var isUnknownArtist = string.IsNullOrWhiteSpace(rawArtist) || rawArtist.Equals("[Unknown Artist]", StringComparison.OrdinalIgnoreCase);
            if (cleanArtistsOnly && isUnknownArtist) continue;

            var artist = isUnknownArtist ? "Resonance Artist" : rawArtist!;
            var rawAlbum = GetString(item, "album")?.Trim();
            var album = string.IsNullOrWhiteSpace(rawAlbum) || rawAlbum.Equals("[Unknown Album]", StringComparison.OrdinalIgnoreCase) ? "Resonance Stream" : rawAlbum;
            var duration = item.TryGetProperty("duration", out var dProp) && dProp.TryGetInt32(out var secs) ? Math.Max(0, secs) : 0;
            var coverArt = GetString(item, "coverArt")?.Trim() ?? id;

            result.Add(new SubsonicTrackDto(
                id, title, artist, album, InferGenre(GetString(item, "genre"), artist, album, title), duration,
                $"{baseUrl}/rest/stream.view?id={Uri.EscapeDataString(id)}&{streamAuth}",
                !string.IsNullOrWhiteSpace(coverArt) ? $"{baseUrl}/rest/getCoverArt.view?id={Uri.EscapeDataString(coverArt)}&size=600&{streamAuth}" : string.Empty,
                $"Pista sincronizada en alta fidelidad desde {baseUrl} — Álbum: {album}.",
                Math.Max(12, 95 - (idx++ * 6))));
        }

        return result;
    }

    private static MusicServerEndpointStatusDto OfflineStatus(string name, string baseUrl, long latencyMs, string error) =>
        new() { Name = name, BaseUrl = baseUrl, IsOnline = false, LatencyMs = latencyMs, Error = error };

    private static string? GetString(JsonElement el, string prop) => el.TryGetProperty(prop, out var value) ? value.GetString() : null;

    private static string InferGenre(string? rawGenre, string artist, string album, string title)
    {
        if (!string.IsNullOrWhiteSpace(rawGenre) && !rawGenre.Equals("Music", StringComparison.OrdinalIgnoreCase) && !rawGenre.Equals("Unknown", StringComparison.OrdinalIgnoreCase))
            return rawGenre.Trim();
        if (artist.Contains("Calva Louise", StringComparison.OrdinalIgnoreCase) || album.Contains("Edge of the Abyss", StringComparison.OrdinalIgnoreCase))
        {
            if (title.Contains("Corriente", StringComparison.OrdinalIgnoreCase) || title.Contains("Umbral", StringComparison.OrdinalIgnoreCase) || title.Contains("Lo Que Vale", StringComparison.OrdinalIgnoreCase)) return "Rock en Español";
            if (title.Contains("Tunnel Vision", StringComparison.OrdinalIgnoreCase) || title.Contains("Impeccable", StringComparison.OrdinalIgnoreCase) || title.Contains("Abyss", StringComparison.OrdinalIgnoreCase)) return "Electronic Rock";
            return "Alternative Rock";
        }
        if (artist.Contains("Heaven Pierce Her", StringComparison.OrdinalIgnoreCase) || album.Contains("Ultrakill", StringComparison.OrdinalIgnoreCase)) return "Electronic";
        if (artist.Contains("Jorge Rivera", StringComparison.OrdinalIgnoreCase) || album.Contains("EPIC", StringComparison.OrdinalIgnoreCase)) return "Soundtrack";
        return artist.Contains("Stories from Styx", StringComparison.OrdinalIgnoreCase) ? "Indie" : "Alternative Rock";
    }
}
