using System.Diagnostics;
using System.Text.Json;
using Resonance.Api.Data;
using Resonance.Api.DTOs;

namespace Resonance.Api.Services;

/// <summary>
/// Conector Subsonic / Navidrome con Failover Activo-Pasivo (<= 2500 ms) y paginación completa (> 100 pistas).
/// </summary>
public class NavidromeService : INavidromeService
{
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly SubsonicCatalogRepository _catalogRepository;
    private readonly ILogger<NavidromeService> _logger;
    private readonly string _primaryUrl;
    private readonly string _mobileUrl;
    private readonly string _username;
    private readonly string _password;
    private readonly string _apiVersion;
    private readonly string _clientName;
    private readonly int _failoverTimeoutMs;

    public NavidromeService(
        IHttpClientFactory httpClientFactory,
        SubsonicCatalogRepository catalogRepository,
        IConfiguration configuration,
        ILogger<NavidromeService> logger)
    {
        _httpClientFactory = httpClientFactory;
        _catalogRepository = catalogRepository;
        _logger = logger;

        var section = configuration.GetSection("MusicServers");
        _primaryUrl = (section["PrimaryUrl"] ?? "https://movil.res0nance.pp.ua").TrimEnd('/');
        _mobileUrl = (section["MobileUrl"] ?? section["SecondaryUrl"] ?? "https://musica.res0nance.pp.ua").TrimEnd('/');
        _username = section["Username"] ?? "Nidus";
        _password = section["Password"] ?? "115r935m";
        _apiVersion = section["ApiVersion"] ?? "1.16.1";
        _clientName = section["ClientName"] ?? "Resonance";
        _failoverTimeoutMs = int.TryParse(section["FailoverTimeoutMs"], out var ms) && ms >= 500 ? ms : 2500;
    }

    public string PrimaryUrl => _primaryUrl;

    public string BuildAuthQuery(bool includeJsonFormat = false)
    {
        var query = $"u={Uri.EscapeDataString(_username)}&p={Uri.EscapeDataString(_password)}&v={Uri.EscapeDataString(_apiVersion)}&c={Uri.EscapeDataString(_clientName)}";
        return includeJsonFormat ? $"{query}&f=json" : query;
    }

    public async Task<MusicServerStatusDto> GetMusicServerStatusAsync(CancellationToken ct = default)
    {
        var primaryTask = PingServerAsync("Resonance Móvil (Servidor Principal)", _primaryUrl, ct);
        var mobileTask = PingServerAsync("Música Resonance (Servidor Secundario / Failover)", _mobileUrl, ct);
        await Task.WhenAll(primaryTask, mobileTask);

        var (syncedCount, totalCount) = await _catalogRepository.GetCatalogCountsAsync(ct);

        return new MusicServerStatusDto
        {
            Primary = primaryTask.Result,
            Mobile = mobileTask.Result,
            ActiveServerUrl = primaryTask.Result.IsOnline ? _primaryUrl : (mobileTask.Result.IsOnline ? _mobileUrl : _primaryUrl),
            FailoverActive = !primaryTask.Result.IsOnline && mobileTask.Result.IsOnline,
            FailoverTimeoutMs = _failoverTimeoutMs,
            Username = _username,
            ApiVersion = _apiVersion,
            SyncedSongsInDatabase = syncedCount,
            TotalSongsInDatabase = totalCount,
            CheckedAtUtc = DateTime.UtcNow
        };
    }

    public async Task<MusicServerSyncResultDto> SyncWithMusicServerAsync(string source = "primary", CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        var normalized = (source ?? "primary").Trim().ToLowerInvariant();
        var usedFallback = false;
        var sourceUsed = _primaryUrl;
        List<SubsonicTrackDto> fetched;

        try
        {
            if (normalized is "mobile" or "secondary" or "musica")
            {
                sourceUsed = _mobileUrl;
                fetched = await FetchCatalogAsync(_mobileUrl, cleanArtistsOnly: false, ct: ct);
            }
            else if (normalized == "both")
            {
                var primaryTask = FetchWithTimeoutAsync(_primaryUrl, cleanArtistsOnly: false, ct);
                var secondaryTask = FetchCatalogAsync(_mobileUrl, cleanArtistsOnly: false, ct: ct);
                await Task.WhenAll(primaryTask, secondaryTask);
                fetched = primaryTask.Result.Concat(secondaryTask.Result)
                    .DistinctBy(t => (t.ExternalId, t.SourceServer))
                    .ToList();
                sourceUsed = $"{_primaryUrl} + {_mobileUrl}";
            }
            else
            {
                fetched = await FetchWithTimeoutAsync(_primaryUrl, cleanArtistsOnly: false, ct);
                if (fetched.Count == 0)
                {
                    _logger.LogWarning("Servidor principal {PrimaryUrl} sin pistas; conmutando al secundario {MobileUrl}.", _primaryUrl, _mobileUrl);
                    fetched = await FetchCatalogAsync(_mobileUrl, cleanArtistsOnly: false, ct: ct);
                    usedFallback = true;
                    sourceUsed = _mobileUrl;
                }
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Fallo en servidor principal {PrimaryUrl}; activando failover a {MobileUrl}.", _primaryUrl, _mobileUrl);
            try
            {
                fetched = await FetchCatalogAsync(_mobileUrl, cleanArtistsOnly: false, ct: ct);
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
                    TotalCatalogCount = await _catalogRepository.CountAsync(ct),
                    ElapsedMs = sw.ElapsedMilliseconds,
                    Message = $"No se pudo conectar al servidor principal ni al secundario: {fallbackEx.Message}"
                };
            }
        }

        var (added, updated, total) = await _catalogRepository.UpsertSubsonicCatalogAsync(fetched, _username, ct);
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
            using var response = await _httpClientFactory.CreateClient("Subsonic")
                .GetAsync($"{baseUrl}/rest/ping.view?{BuildAuthQuery(true)}", timeoutCts.Token);
            sw.Stop();
            if (!response.IsSuccessStatusCode)
                return OfflineStatus(name, baseUrl, sw.ElapsedMilliseconds, $"HTTP {(int)response.StatusCode}");

            using var doc = JsonDocument.Parse(await response.Content.ReadAsStringAsync(timeoutCts.Token));
            if (!doc.RootElement.TryGetProperty("subsonic-response", out var subsonic))
                return OfflineStatus(name, baseUrl, sw.ElapsedMilliseconds, "Respuesta JSON sin nodo subsonic-response.");

            var isOk = string.Equals(SubsonicParser.GetString(subsonic, "status"), "ok", StringComparison.OrdinalIgnoreCase);
            return new MusicServerEndpointStatusDto
            {
                Name = name, BaseUrl = baseUrl, IsOnline = isOk,
                ServerType = SubsonicParser.GetString(subsonic, "type") ?? "subsonic",
                ServerVersion = SubsonicParser.GetString(subsonic, "serverVersion") ?? _apiVersion,
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

    private async Task<List<SubsonicTrackDto>> FetchWithTimeoutAsync(string baseUrl, bool cleanArtistsOnly, CancellationToken ct)
    {
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(_failoverTimeoutMs * 3);
        try
        {
            return await FetchCatalogAsync(baseUrl, 5000, cleanArtistsOnly, timeoutCts.Token);
        }
        catch
        {
            return new List<SubsonicTrackDto>();
        }
    }

    public async Task<List<SubsonicTrackDto>> FetchCatalogAsync(string baseUrl, int maxSongs = 5000, bool cleanArtistsOnly = false, CancellationToken ct = default)
    {
        var client = _httpClientFactory.CreateClient("Subsonic");
        var auth = BuildAuthQuery(true);
        var streamAuth = BuildAuthQuery(false);
        var allTracks = new List<SubsonicTrackDto>();
        var seen = new HashSet<string>(StringComparer.Ordinal);
        const int pageSize = 500;
        var maxPages = Math.Max(1, (maxSongs + pageSize - 1) / pageSize);

        for (var page = 0; page < maxPages; page++)
        {
            var offset = page * pageSize;
            var url = $"{baseUrl}/rest/search3.view?query=&songCount={pageSize}&songOffset={offset}&{auth}";
            using var response = await client.GetAsync(url, ct);
            if (!response.IsSuccessStatusCode) break;

            var json = await response.Content.ReadAsStringAsync(ct);
            var (batch, rawCount) = SubsonicParser.ParseTracks(json, baseUrl, "searchResult3", streamAuth, cleanArtistsOnly, seen, allTracks.Count);
            allTracks.AddRange(batch);
            if (rawCount < pageSize || allTracks.Count >= maxSongs) break;
        }

        if (allTracks.Count == 0)
        {
            using var response = await client.GetAsync($"{baseUrl}/rest/getRandomSongs.view?size=500&{auth}", ct);
            if (response.IsSuccessStatusCode)
            {
                var json = await response.Content.ReadAsStringAsync(ct);
                var (batch, _) = SubsonicParser.ParseTracks(json, baseUrl, "randomSongs", streamAuth, cleanArtistsOnly, seen, 0);
                allTracks.AddRange(batch);
            }
        }

        return allTracks;
    }

    private static MusicServerEndpointStatusDto OfflineStatus(string name, string baseUrl, long latencyMs, string error) =>
        new() { Name = name, BaseUrl = baseUrl, IsOnline = false, LatencyMs = latencyMs, Error = error };
}
