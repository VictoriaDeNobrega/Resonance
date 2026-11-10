using Microsoft.EntityFrameworkCore;
using Resonance.Api.Data;
using Resonance.Api.Models;
using Resonance.DTOs;

namespace Resonance.Services;

public class PlaylistService : IPlaylistService
{
    private readonly AppDbContext _context;
    private const string DefaultCoverUrl = "https://resonance.app/assets/default-cover.png";

    public PlaylistService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PlaylistResponseDto> CreateAsync(string userId, CreatePlaylistDto dto)
    {
        var playlist = new Playlist
        {
            UserId = userId,
            Name = dto.Name.Trim(),
            CoverImageUrl = string.IsNullOrWhiteSpace(dto.CoverImageUrl)
                ? DefaultCoverUrl
                : dto.CoverImageUrl.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Playlists.Add(playlist);
        await _context.SaveChangesAsync();

        return MapToDto(playlist);
    }

    public async Task<IEnumerable<PlaylistResponseDto>> GetUserPlaylistsAsync(string userId)
    {
        return await _context.Playlists
            .AsNoTracking()
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => new PlaylistResponseDto(
                p.Id, 
                p.UserId, 
                p.Name, 
                p.CoverImageUrl, 
                p.CreatedAt, 
                p.UpdatedAt
            ))
            .ToListAsync();
    }

    public async Task<PlaylistResponseDto?> UpdateDetailsAsync(Guid id, string userId, UpdatePlaylistDto dto)
    {
        var playlist = await _context.Playlists.FirstOrDefaultAsync(p => p.Id == id);

        if (playlist == null) return null;

        if (playlist.UserId != userId)
        {
            throw new UnauthorizedAccessException("No tienes permisos para editar esta playlist.");
        }

        if (!string.IsNullOrWhiteSpace(dto.Name))
        {
            playlist.Name = dto.Name.Trim();
        }

        if (dto.CoverImageUrl != null)
        {
            playlist.CoverImageUrl = string.IsNullOrWhiteSpace(dto.CoverImageUrl) 
                ? DefaultCoverUrl 
                : dto.CoverImageUrl.Trim();
        }

        playlist.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();

        return MapToDto(playlist);
    }

    private static PlaylistResponseDto MapToDto(Playlist p)
    {
        return new PlaylistResponseDto(p.Id, p.UserId, p.Name, p.CoverImageUrl, p.CreatedAt, p.UpdatedAt);
    }
}
