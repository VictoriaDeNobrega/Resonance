using Resonance.Api.DTOs;

namespace Resonance.Api.Services;

public interface IRoomService
{
    Task<List<RoomSummaryDto>> GetActiveRoomsAsync(string? genre = null, string? search = null, CancellationToken ct = default);
    Task<ServiceResult<RoomDetailDto>> GetRoomByCodeAsync(string code, bool includeAccessKey = false, CancellationToken ct = default);
    Task<ServiceResult<RoomDetailDto>> CreateRoomAsync(CreateRoomDto dto, CancellationToken ct = default);
    Task<ServiceResult<RoomDetailDto>> JoinRoomAsync(string code, JoinRoomRequestDto dto, CancellationToken ct = default);
    Task<ServiceResult<RoomSummaryDto>> LeaveRoomAsync(string code, Guid? userId = null, CancellationToken ct = default);
    Task<ServiceResult<RoomDetailDto>> SyncPlaybackStateAsync(string code, SyncPlaybackDto dto, CancellationToken ct = default);
    Task<ServiceResult<RoomDetailDto>> AddSongToQueueAsync(string code, AddRoomSongDto dto, CancellationToken ct = default);
    Task<ServiceResult<RoomDetailDto>> RemoveSongFromQueueAsync(string code, Guid roomSongId, Guid? requesterId = null, CancellationToken ct = default);
    Task<ServiceResult<RoomDetailDto>> VoteQueueSongAsync(string code, Guid roomSongId, Guid userId, CancellationToken ct = default);
    Task<ServiceResult<SkipVoteResultDto>> CastSkipVoteAsync(string code, Guid userId, CancellationToken ct = default);
    Task<ServiceResult<List<RoomMessageDto>>> GetMessagesAsync(string code, int limit = 100, CancellationToken ct = default);
    Task<ServiceResult<RoomMessageDto>> SendMessageAsync(string code, SendRoomMessageDto dto, CancellationToken ct = default);
    Task<ServiceResult<bool>> CloseRoomAsync(string code, Guid requesterId, bool hardDelete = false, CancellationToken ct = default);
}
