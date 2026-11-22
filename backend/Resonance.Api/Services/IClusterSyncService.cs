using Resonance.Api.DTOs;

namespace Resonance.Api.Services;

public interface IClusterSyncService
{
    Task<ClusterNodeStatusDto> GetClusterStatusAsync(CancellationToken ct = default);
    Task<ClusterDatabaseSnapshotDto> ExportSnapshotAsync(CancellationToken ct = default);
    Task<ClusterSyncResultDto> ImportSnapshotAsync(ClusterDatabaseSnapshotDto snapshot, CancellationToken ct = default);
    Task<ClusterSyncResultDto> SynchronizeWithPeerAsync(CancellationToken ct = default);
    bool ValidateClusterKey(string? providedKey);
}
