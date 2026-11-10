using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using Resonance.Api.Data;
using Resonance.Api.DTOs.Rooms;
using Resonance.Api.Models;
using Resonance.Api.Services.Interfaces;

namespace Resonance.Api.Services.Implementations;

public class RoomService : IRoomService
{
    private readonly AppDbContext _context;
    private static readonly ConcurrentDictionary<string, Room> _inMemoryRooms = new(StringComparer.OrdinalIgnoreCase);

    public RoomService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<RoomDto> CreateRoomAsync(CreateRoomDto dto)
    {
        var code = GenerateRoomCode();
        var room = new Room
        {
            Id = Guid.NewGuid(),
            Code = code,
            Title = dto.Title.Trim(),
            HostId = dto.HostName.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        try
        {
            _context.Rooms.Add(room);
            await _context.SaveChangesAsync();
        }
        catch
        {
            // Fallback en memoria si PostgreSQL no está activo
            _inMemoryRooms[code] = room;
        }

        return MapToDto(room);
    }

    public async Task<RoomDto?> GetRoomByCodeAsync(string code)
    {
        try
        {
            var room = await _context.Rooms
                .Include(r => r.Queue.OrderBy(q => q.Order))
                .FirstOrDefaultAsync(r => r.Code.ToUpper() == code.ToUpper() && r.IsActive);

            if (room != null) return MapToDto(room);
        }
        catch
        {
            // Fallback a memoria
        }

        if (_inMemoryRooms.TryGetValue(code, out var memRoom) && memRoom.IsActive)
        {
            return MapToDto(memRoom);
        }

        return null;
    }

    public async Task<bool> CloseRoomAsync(string code, string hostId)
    {
        try
        {
            var room = await _context.Rooms.FirstOrDefaultAsync(r => r.Code == code);
            if (room != null)
            {
                room.IsActive = false;
                await _context.SaveChangesAsync();
                return true;
            }
        }
        catch
        {
            // Fallback a memoria
        }

        if (_inMemoryRooms.TryGetValue(code, out var memRoom))
        {
            memRoom.IsActive = false;
            return true;
        }

        return false;
    }

    public async Task<bool> AddSongToQueueAsync(string code, RoomSong song)
    {
        try
        {
            var room = await _context.Rooms.Include(r => r.Queue).FirstOrDefaultAsync(r => r.Code == code);
            if (room != null && room.IsActive)
            {
                song.RoomId = room.Id;
                song.Order = room.Queue.Count + 1;
                _context.RoomSongs.Add(song);

                if (string.IsNullOrEmpty(room.CurrentSongUrl))
                {
                    room.CurrentSongId = song.SongId;
                    room.CurrentSongTitle = song.Title;
                    room.CurrentSongArtist = song.Artist;
                    room.CurrentSongUrl = song.Url;
                    room.CurrentTimeMs = 0;
                    room.IsPlaying = true;
                }

                await _context.SaveChangesAsync();
                return true;
            }
        }
        catch
        {
            // Fallback a memoria
        }

        if (_inMemoryRooms.TryGetValue(code, out var memRoom) && memRoom.IsActive)
        {
            song.RoomId = memRoom.Id;
            song.Order = memRoom.Queue.Count + 1;
            memRoom.Queue.Add(song);

            if (string.IsNullOrEmpty(memRoom.CurrentSongUrl))
            {
                memRoom.CurrentSongId = song.SongId;
                memRoom.CurrentSongTitle = song.Title;
                memRoom.CurrentSongArtist = song.Artist;
                memRoom.CurrentSongUrl = song.Url;
                memRoom.CurrentTimeMs = 0;
                memRoom.IsPlaying = true;
            }
            return true;
        }

        return false;
    }

    public async Task<bool> RemoveSongFromQueueAsync(string code, Guid roomSongId)
    {
        try
        {
            var song = await _context.RoomSongs.FirstOrDefaultAsync(s => s.Id == roomSongId);
            if (song != null)
            {
                _context.RoomSongs.Remove(song);
                await _context.SaveChangesAsync();
                return true;
            }
        }
        catch
        {
            // Fallback a memoria
        }

        if (_inMemoryRooms.TryGetValue(code, out var memRoom))
        {
            memRoom.Queue.RemoveAll(s => s.Id == roomSongId);
            return true;
        }

        return false;
    }

    public async Task<bool> UpdatePlaybackStateAsync(SyncPlaybackDto syncDto)
    {
        try
        {
            var room = await _context.Rooms.FirstOrDefaultAsync(r => r.Code == syncDto.RoomCode);
            if (room != null && room.IsActive)
            {
                if (!string.IsNullOrEmpty(syncDto.SongUrl))
                {
                    room.CurrentSongId = syncDto.SongId;
                    room.CurrentSongTitle = syncDto.SongTitle;
                    room.CurrentSongArtist = syncDto.SongArtist;
                    room.CurrentSongUrl = syncDto.SongUrl;
                }

                room.CurrentTimeMs = syncDto.CurrentTimeMs;
                room.IsPlaying = syncDto.IsPlaying;

                await _context.SaveChangesAsync();
                return true;
            }
        }
        catch
        {
            // Fallback a memoria
        }

        if (_inMemoryRooms.TryGetValue(syncDto.RoomCode, out var memRoom) && memRoom.IsActive)
        {
            if (!string.IsNullOrEmpty(syncDto.SongUrl))
            {
                memRoom.CurrentSongId = syncDto.SongId;
                memRoom.CurrentSongTitle = syncDto.SongTitle;
                memRoom.CurrentSongArtist = syncDto.SongArtist;
                memRoom.CurrentSongUrl = syncDto.SongUrl;
            }

            memRoom.CurrentTimeMs = syncDto.CurrentTimeMs;
            memRoom.IsPlaying = syncDto.IsPlaying;
            return true;
        }

        return false;
    }

    private static string GenerateRoomCode()
    {
        const string chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        var random = new Random();
        return "RES-" + new string(Enumerable.Repeat(chars, 4).Select(s => s[random.Next(s.Length)]).ToArray());
    }

    private static RoomDto MapToDto(Room r)
    {
        return new RoomDto
        {
            Id = r.Id,
            Code = r.Code,
            Title = r.Title,
            HostId = r.HostId,
            CurrentSongId = r.CurrentSongId,
            CurrentSongTitle = r.CurrentSongTitle,
            CurrentSongArtist = r.CurrentSongArtist,
            CurrentSongUrl = r.CurrentSongUrl,
            CurrentTimeMs = r.CurrentTimeMs,
            IsPlaying = r.IsPlaying,
            IsActive = r.IsActive,
            CreatedAt = r.CreatedAt,
            Queue = r.Queue
        };
    }
}
