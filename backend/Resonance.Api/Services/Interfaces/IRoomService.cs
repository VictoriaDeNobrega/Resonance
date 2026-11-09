using Resonance.Api.DTOs.Rooms;
using Resonance.Api.Models;

namespace Resonance.Api.Services.Interfaces;

public interface IRoomService
{
    Task<RoomDto> CreateRoomAsync(CreateRoomDto dto);
    Task<RoomDto?> GetRoomByCodeAsync(string code);
    Task<bool> CloseRoomAsync(string code, string hostId);
    Task<bool> AddSongToQueueAsync(string code, RoomSong song);
    Task<bool> RemoveSongFromQueueAsync(string code, Guid roomSongId);
    Task<bool> UpdatePlaybackStateAsync(SyncPlaybackDto syncDto);
}
