using Microsoft.EntityFrameworkCore;
using Resonance.Api.Data;
using Resonance.Api.DTOs.Rooms;
using Resonance.Api.Models;
using Resonance.Api.Services.Interfaces;

namespace Resonance.Api.Services.Implementations;

public class RoomService : IRoomService
{
    private readonly AppDbContext _context;

    public RoomService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<RoomDto> CreateRoomAsync(CreateRoomDto dto)
    {
        var code = GenerateRoomCode();
        while (await _context.Rooms.AnyAsync(r => r.Code == code))
        {
            code = GenerateRoomCode();
        }

        var room = new Room
        {
            Code = code,
            Title = dto.Title.Trim(),
            HostId = dto.HostName.Trim(),
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        _context.Rooms.Add(room);
        await _context.SaveChangesAsync();

        return MapToDto(room);
    }

    public async Task<RoomDto?> GetRoomByCodeAsync(string code)
    {
        var room = await _context.Rooms
            .Include(r => r.Queue.OrderBy(q => q.Order))
            .FirstOrDefaultAsync(r => r.Code.ToUpper() == code.ToUpper() && r.IsActive);

        return room == null ? null : MapToDto(room);
    }

    public async Task<bool> CloseRoomAsync(string code, string hostId)
    {
        var room = await _context.Rooms.FirstOrDefaultAsync(r => r.Code == code);
        if (room == null) return false;

        room.IsActive = false;
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> AddSongToQueueAsync(string code, RoomSong song)
    {
        var room = await _context.Rooms.Include(r => r.Queue).FirstOrDefaultAsync(r => r.Code == code);
        if (room == null || !room.IsActive) return false;

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

    public async Task<bool> RemoveSongFromQueueAsync(string code, Guid roomSongId)
    {
        var song = await _context.RoomSongs.FirstOrDefaultAsync(s => s.Id == roomSongId);
        if (song == null) return false;

        _context.RoomSongs.Remove(song);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<bool> UpdatePlaybackStateAsync(SyncPlaybackDto syncDto)
    {
        var room = await _context.Rooms.FirstOrDefaultAsync(r => r.Code == syncDto.RoomCode);
        if (room == null || !room.IsActive) return false;

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
