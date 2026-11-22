using System.Diagnostics;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.EntityFrameworkCore;
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
        string.IsNullOrWhiteSpace(_clusterSyncKey) ||
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

        return new ClusterDatabaseSnapshotDto
        {
            SourceNodeUrl = _selfUrl,
            ExportedAtUtc = DateTime.UtcNow,
            Users = await db.Users.AsNoTracking().ToListAsync(ct),
            Songs = await db.Songs.AsNoTracking().ToListAsync(ct),
            UserFavoriteSongs = await db.UserFavoriteSongs.AsNoTracking().ToListAsync(ct),
            Reviews = await db.Reviews.AsNoTracking().ToListAsync(ct),
            Playlists = await db.Playlists.AsNoTracking().ToListAsync(ct),
            PlaylistSongs = await db.PlaylistSongs.AsNoTracking().ToListAsync(ct),
            Communities = await db.Communities.AsNoTracking().ToListAsync(ct),
            CommunityMembers = await db.CommunityMembers.AsNoTracking().ToListAsync(ct),
            CommunityPlaylists = await db.CommunityPlaylists.AsNoTracking().ToListAsync(ct),
            CommunitySongs = await db.CommunitySongs.AsNoTracking().ToListAsync(ct),
            CommunityComments = await db.CommunityComments.AsNoTracking().ToListAsync(ct),
            Rooms = await db.Rooms.AsNoTracking().ToListAsync(ct),
            RoomSongs = await db.RoomSongs.AsNoTracking().ToListAsync(ct),
            RoomMessages = await db.RoomMessages.AsNoTracking().ToListAsync(ct)
        };
    }

    public async Task<ClusterSyncResultDto> ImportSnapshotAsync(ClusterDatabaseSnapshotDto snapshot, CancellationToken ct = default)
    {
        var sw = Stopwatch.StartNew();
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        int usersMerged = 0, songsMerged = 0, playlistsMerged = 0, communitiesMerged = 0, roomsMerged = 0;

        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var userIds = (await db.Users.Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        var userEmails = (await db.Users.Select(x => x.Email).ToListAsync(ct)).ToHashSet();
        foreach (var u in snapshot.Users)
        {
            if (!userIds.Contains(u.Id) && !userEmails.Contains(u.Email))
            {
                u.LastPlayedSongId = null;
                db.Users.Add(u);
                userIds.Add(u.Id);
                userEmails.Add(u.Email);
                usersMerged++;
            }
        }
        await db.SaveChangesAsync(ct);

        var songIds = (await db.Songs.Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        var songExtIds = (await db.Songs.Where(x => x.ExternalId != null).Select(x => x.ExternalId!).ToListAsync(ct)).ToHashSet();
        foreach (var s in snapshot.Songs)
        {
            if (!songIds.Contains(s.Id) && (s.ExternalId == null || !songExtIds.Contains(s.ExternalId)))
            {
                if (s.UploadedById.HasValue && !userIds.Contains(s.UploadedById.Value)) s.UploadedById = null;
                db.Songs.Add(s);
                songIds.Add(s.Id);
                if (s.ExternalId != null) songExtIds.Add(s.ExternalId);
                songsMerged++;
            }
        }
        await db.SaveChangesAsync(ct);

        var plIds = (await db.Playlists.Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        foreach (var p in snapshot.Playlists.Where(p => !plIds.Contains(p.Id) && userIds.Contains(p.UserId)))
        {
            db.Playlists.Add(p);
            plIds.Add(p.Id);
            playlistsMerged++;
        }
        await db.SaveChangesAsync(ct);

        var psPairs = await db.PlaylistSongs.Select(x => new { x.PlaylistId, x.SongId }).ToListAsync(ct);
        var psSet = psPairs.Select(x => (x.PlaylistId, x.SongId)).ToHashSet();
        foreach (var ps in snapshot.PlaylistSongs.Where(ps => plIds.Contains(ps.PlaylistId) && songIds.Contains(ps.SongId) && psSet.Add((ps.PlaylistId, ps.SongId))))
            db.PlaylistSongs.Add(ps);

        var commIds = (await db.Communities.Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        var commNames = (await db.Communities.Select(x => x.NormalizedName).ToListAsync(ct)).ToHashSet();
        foreach (var c in snapshot.Communities.Where(c => !commIds.Contains(c.Id) && !commNames.Contains(c.NormalizedName) && userIds.Contains(c.CreatorId)))
        {
            db.Communities.Add(c);
            commIds.Add(c.Id);
            commNames.Add(c.NormalizedName);
            communitiesMerged++;
        }
        await db.SaveChangesAsync(ct);

        var cmSet = (await db.CommunityMembers.Select(x => new { x.CommunityId, x.UserId }).ToListAsync(ct)).Select(x => (x.CommunityId, x.UserId)).ToHashSet();
        foreach (var cm in snapshot.CommunityMembers.Where(cm => commIds.Contains(cm.CommunityId) && userIds.Contains(cm.UserId) && cmSet.Add((cm.CommunityId, cm.UserId))))
            db.CommunityMembers.Add(cm);

        var cpSet = (await db.CommunityPlaylists.Select(x => new { x.CommunityId, x.PlaylistId }).ToListAsync(ct)).Select(x => (x.CommunityId, x.PlaylistId)).ToHashSet();
        foreach (var cp in snapshot.CommunityPlaylists.Where(cp => commIds.Contains(cp.CommunityId) && plIds.Contains(cp.PlaylistId) && cpSet.Add((cp.CommunityId, cp.PlaylistId))))
            db.CommunityPlaylists.Add(cp);

        var csSet = (await db.CommunitySongs.Select(x => new { x.CommunityId, x.SongId }).ToListAsync(ct)).Select(x => (x.CommunityId, x.SongId)).ToHashSet();
        foreach (var cs in snapshot.CommunitySongs.Where(cs => commIds.Contains(cs.CommunityId) && songIds.Contains(cs.SongId) && csSet.Add((cs.CommunityId, cs.SongId))))
            db.CommunitySongs.Add(cs);

        var ccIds = (await db.CommunityComments.Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        foreach (var cc in snapshot.CommunityComments.Where(cc => !ccIds.Contains(cc.Id) && commIds.Contains(cc.CommunityId) && userIds.Contains(cc.AuthorId)))
            db.CommunityComments.Add(cc);

        var roomIds = (await db.Rooms.Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        var roomCodes = (await db.Rooms.Select(x => x.Code).ToListAsync(ct)).ToHashSet();
        foreach (var r in snapshot.Rooms.Where(r => !roomIds.Contains(r.Id) && !roomCodes.Contains(r.Code) && userIds.Contains(r.HostId)))
        {
            db.Rooms.Add(r);
            roomIds.Add(r.Id);
            roomCodes.Add(r.Code);
            roomsMerged++;
        }
        await db.SaveChangesAsync(ct);

        await tx.CommitAsync(ct);
        sw.Stop();

        _lastSyncAtUtc = DateTime.UtcNow;
        _lastSyncMessage = $"Sincronizado desde {snapshot.SourceNodeUrl}: +{usersMerged} usuarios, +{songsMerged} canciones, +{playlistsMerged} playlists, +{communitiesMerged} comunidades, +{roomsMerged} salas.";

        return new ClusterSyncResultDto
        {
            Success = true, NodeRole = _nodeRole, PeerUrl = snapshot.SourceNodeUrl,
            UsersMerged = usersMerged, SongsMerged = songsMerged, PlaylistsMerged = playlistsMerged,
            CommunitiesMerged = communitiesMerged, RoomsMerged = roomsMerged,
            ElapsedMs = sw.ElapsedMilliseconds, Message = _lastSyncMessage
        };
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
                return new ClusterSyncResultDto { Success = false, NodeRole = _nodeRole, PeerUrl = _peerUrl, Message = "Snapshot vacío del nodo par." };
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
