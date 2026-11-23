using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Resonance.Api.Data;
using Resonance.Api.DTOs;

namespace Resonance.Api.Services;

public class ClusterSyncService : BackgroundService, IClusterSyncService
{
    private static readonly JsonSerializerOptions SyncJsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        PropertyNameCaseInsensitive = true,
        ReferenceHandler = ReferenceHandler.IgnoreCycles
    };

    private static readonly SemaphoreSlim SyncLock = new(1, 1);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IHttpClientFactory _httpClientFactory;
    private readonly ILogger<ClusterSyncService> _logger;
    private readonly string _nodeRole;
    private readonly string _selfUrl;
    private readonly string _peerUrl;
    private readonly int _failoverTimeoutMs;
    private readonly int _syncIntervalSeconds;
    private readonly string _clusterSyncKey;

    private static DateTime? _lastSyncAtUtc;
    private static string _lastSyncMessage = "Pendiente de primera sincronización.";

    public ClusterSyncService(
        IServiceScopeFactory scopeFactory,
        IHttpClientFactory httpClientFactory,
        IConfiguration configuration,
        ILogger<ClusterSyncService> logger)
    {
        _scopeFactory = scopeFactory;
        _httpClientFactory = httpClientFactory;
        _logger = logger;

        var section = configuration.GetSection("ClusterSync");
        _nodeRole = (section["NodeRole"] ?? "primary").Trim().ToLowerInvariant();
        _selfUrl = (section["SelfPublicUrl"] ?? "https://movil.res0nance.pp.ua").TrimEnd('/');
        _peerUrl = (section["PeerPublicUrl"] ?? "https://musica.res0nance.pp.ua").TrimEnd('/');
        _failoverTimeoutMs = int.TryParse(section["FailoverTimeoutMs"], out var fms) && fms >= 500 ? fms : 2500;
        _syncIntervalSeconds = int.TryParse(section["SyncIntervalSeconds"], out var sis) && sis >= 5 ? sis : 15;
        _clusterSyncKey = section["ClusterSyncKey"] ?? "Resonance-Cluster-Sync-2026-Key";
    }

    public bool ValidateClusterKey(string? providedKey) =>
        !string.IsNullOrWhiteSpace(_clusterSyncKey) &&
        string.Equals(providedKey, _clusterSyncKey, StringComparison.Ordinal);

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await Task.Delay(TimeSpan.FromSeconds(5), stoppingToken);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await SynchronizeWithPeerAsync(stoppingToken);
            }
            catch (Exception ex) when (ex is not OperationCanceledException)
            {
                _logger.LogDebug("[ClusterSync] Peer {PeerUrl} no disponible aún: {Msg}", _peerUrl, ex.Message);
            }

            await Task.Delay(TimeSpan.FromSeconds(_syncIntervalSeconds), stoppingToken);
        }
    }

    public async Task<ClusterNodeStatusDto> GetClusterStatusAsync(CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        var peerOnline = false;
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(_failoverTimeoutMs);

        try
        {
            var client = _httpClientFactory.CreateClient("ClusterPeer");
            using var res = await client.GetAsync($"{_peerUrl}/health", timeoutCts.Token);
            peerOnline = res.IsSuccessStatusCode;
        }
        catch
        {
            peerOnline = false;
        }
        sw.Stop();

        return new ClusterNodeStatusDto
        {
            NodeRole = _nodeRole,
            SelfPublicUrl = _selfUrl,
            PeerPublicUrl = _peerUrl,
            PeerOnline = peerOnline,
            PeerLatencyMs = sw.ElapsedMilliseconds,
            FailoverActive = _nodeRole == "secondary" && !peerOnline,
            FailoverTimeoutMs = _failoverTimeoutMs,
            LastSyncAtUtc = _lastSyncAtUtc,
            LastSyncMessage = _lastSyncMessage
        };
    }

    public async Task<ClusterDatabaseSnapshotDto> ExportSnapshotAsync(CancellationToken ct = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
        return await ClusterSnapshotMapper.ExportAsync(db, _selfUrl, ct);
    }

    public async Task<ClusterSyncResultDto> ImportSnapshotAsync(ClusterDatabaseSnapshotDto snapshot, CancellationToken ct = default)
    {
        await SyncLock.WaitAsync(ct);
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
            var (result, summary) = await ClusterSnapshotMapper.ImportAsync(db, snapshot, _nodeRole, ct);
            _lastSyncAtUtc = DateTime.UtcNow;
            _lastSyncMessage = summary;
            return result;
        }
        finally
        {
            SyncLock.Release();
        }
    }

    public async Task<ClusterSyncResultDto> SynchronizeWithPeerAsync(CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(ct);
        timeoutCts.CancelAfter(Math.Max(5000, _failoverTimeoutMs * 2));

        try
        {
            var client = _httpClientFactory.CreateClient("ClusterPeer");
            using var req = new HttpRequestMessage(HttpMethod.Get, $"{_peerUrl}/api/songs/cluster-snapshot");
            req.Headers.Add("X-Cluster-Sync-Key", _clusterSyncKey);

            using var res = await client.SendAsync(req, timeoutCts.Token);
            if (!res.IsSuccessStatusCode)
            {
                sw.Stop();
                return new ClusterSyncResultDto
                {
                    Success = false, NodeRole = _nodeRole, PeerUrl = _peerUrl, ElapsedMs = sw.ElapsedMilliseconds,
                    Message = $"Nodo par {_peerUrl} devolvió HTTP {(int)res.StatusCode}."
                };
            }

            var remoteSnapshot = await res.Content.ReadFromJsonAsync<ClusterDatabaseSnapshotDto>(SyncJsonOptions, timeoutCts.Token);
            if (remoteSnapshot is null)
            {
                sw.Stop();
                return new ClusterSyncResultDto
                {
                    Success = false, NodeRole = _nodeRole, PeerUrl = _peerUrl, Message = "Snapshot vacío del nodo par."
                };
            }

            return await ImportSnapshotAsync(remoteSnapshot, ct);
        }
        catch (Exception ex)
        {
            sw.Stop();
            _lastSyncMessage = $"Peer {_peerUrl} inalcanzable ({ex.Message}). Operando de forma autónoma.";
            return new ClusterSyncResultDto
            {
                Success = false, NodeRole = _nodeRole, PeerUrl = _peerUrl,
                ElapsedMs = sw.ElapsedMilliseconds, Message = _lastSyncMessage
            };
        }
    }
}
