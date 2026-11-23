using Microsoft.AspNetCore.Mvc;
using Resonance.Api.DTOs;
using Resonance.Api.Services;

namespace Resonance.Api.Controllers;

[Route("api/[controller]")]
public class SongsController : ApiControllerBase
{
    private readonly ISongService _songService;
    private readonly IClusterSyncService _clusterSyncService;

    public SongsController(ISongService songService, IClusterSyncService clusterSyncService)
    {
        _songService = songService;
        _clusterSyncService = clusterSyncService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll(
        [FromQuery] string? query = null,
        [FromQuery] string? genre = null,
        [FromQuery] string? artist = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 500,
        [FromQuery] Guid? userId = null,
        [FromQuery] string? server = null,
        CancellationToken ct = default) =>
        Ok(await _songService.SearchSongsAsync(query, genre, artist, page, pageSize, userId, server, ct));

    [HttpGet("home")]
    public async Task<IActionResult> GetHome([FromQuery] Guid? userId = null, [FromQuery] string? server = null, CancellationToken ct = default) =>
        Ok(await _songService.GetHomeSongsAsync(userId, server, ct));

    [HttpGet("global-search")]
    public async Task<IActionResult> GlobalSearch(
        [FromQuery] string? query = null,
        [FromQuery] string? genre = null,
        [FromQuery] string? artist = null,
        [FromQuery] string? filter = "all",
        [FromQuery] Guid? userId = null,
        [FromQuery] string? server = null,
        CancellationToken ct = default) =>
        Ok(await _songService.GlobalSearchAsync(query, genre, artist, filter, userId, server, ct));

    [HttpGet("search")]
    public async Task<IActionResult> SearchSongs(
        [FromQuery] string? query = null,
        [FromQuery] string? genre = null,
        [FromQuery] string? artist = null,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 500,
        [FromQuery] Guid? userId = null,
        [FromQuery] string? server = null,
        CancellationToken ct = default) =>
        Ok(await _songService.SearchSongsAsync(query, genre, artist, page, pageSize, userId, server, ct));

    [HttpGet("stats")]
    public async Task<IActionResult> GetGlobalStats([FromQuery] Guid? userId = null, [FromQuery] string? server = null, CancellationToken ct = default) =>
        Ok(await _songService.GetGlobalStatsAsync(userId, server, ct));

    [HttpGet("server-status")]
    public async Task<IActionResult> GetServerStatus(CancellationToken ct = default) =>
        Ok(await _songService.GetMusicServerStatusAsync(ct));

    [HttpPost("sync-server")]
    public async Task<IActionResult> SyncServer([FromQuery] string source = "primary", CancellationToken ct = default) =>
        Ok(await _songService.SyncWithMusicServerAsync(source, ct));

    [HttpGet("cluster-status")]
    public async Task<IActionResult> GetClusterStatus(CancellationToken ct = default) =>
        Ok(await _clusterSyncService.GetClusterStatusAsync(ct));

    [HttpGet("cluster-snapshot")]
    public async Task<IActionResult> GetClusterSnapshot(CancellationToken ct = default)
    {
        var key = Request.Headers["X-Cluster-Sync-Key"].FirstOrDefault();
        if (!_clusterSyncService.ValidateClusterKey(key))
            return Unauthorized(new { message = "Clave de sincronización de clúster inválida." });

        return Ok(await _clusterSyncService.ExportSnapshotAsync(ct));
    }

    [HttpPost("cluster-push")]
    public async Task<IActionResult> PushClusterSnapshot([FromBody] ClusterDatabaseSnapshotDto snapshot, CancellationToken ct = default)
    {
        var key = Request.Headers["X-Cluster-Sync-Key"].FirstOrDefault();
        if (!_clusterSyncService.ValidateClusterKey(key))
            return Unauthorized(new { message = "Clave de sincronización de clúster inválida." });

        return Ok(await _clusterSyncService.ImportSnapshotAsync(snapshot, ct));
    }

    [HttpPost("cluster-sync")]
    public async Task<IActionResult> TriggerClusterSync(CancellationToken ct = default) =>
        Ok(await _clusterSyncService.SynchronizeWithPeerAsync(ct));

    [HttpGet("favorites/{userId:guid}")]
    public async Task<IActionResult> GetUserFavorites(Guid userId, CancellationToken ct = default) =>
        Ok(await _songService.GetUserFavoritesAsync(userId, ct));

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, [FromQuery] Guid? userId = null, CancellationToken ct = default) =>
        ToActionResult(await _songService.GetSongByIdAsync(id, userId, ct));

    [HttpGet("{id:guid}/stats")]
    public async Task<IActionResult> GetSongStats(Guid id, CancellationToken ct = default) =>
        ToActionResult(await _songService.GetSongStatsAsync(id, ct));

    [HttpPost]
    public async Task<IActionResult> CreateSong([FromBody] CreateSongDto dto, CancellationToken ct = default) =>
        ToActionResult(await _songService.CreateSongAsync(dto, ct));

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> UpdateSong(Guid id, [FromBody] UpdateSongDto dto, CancellationToken ct = default) =>
        ToActionResult(await _songService.UpdateSongAsync(id, dto, ct));

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteSong(Guid id, CancellationToken ct = default) =>
        ToMessageResult(await _songService.DeleteSongAsync(id, ct), "Canción eliminada correctamente.");

    [HttpPost("{id:guid}/play")]
    public async Task<IActionResult> RegisterPlay(Guid id, [FromBody] PlaySongRequestDto? dto = null, CancellationToken ct = default) =>
        ToActionResult(await _songService.RegisterPlayAsync(id, dto?.UserId, ct));

    [HttpPost("{id:guid}/favorite")]
    public async Task<IActionResult> ToggleFavorite(Guid id, [FromBody] FavoriteToggleRequestDto dto, CancellationToken ct = default) =>
        ToActionResult(await _songService.ToggleFavoriteAsync(id, dto.UserId, ct));

    [HttpGet("{id:guid}/reviews")]
    public async Task<IActionResult> GetReviews(Guid id, CancellationToken ct = default) =>
        ToActionResult(await _songService.GetReviewsAsync(id, ct));

    [HttpPost("{id:guid}/reviews")]
    public async Task<IActionResult> AddReview(Guid id, [FromBody] CreateReviewDto dto, CancellationToken ct = default) =>
        ToActionResult(await _songService.AddReviewAsync(id, dto, ct));
}
