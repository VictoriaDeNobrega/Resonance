using System.Collections.Concurrent;
using Microsoft.EntityFrameworkCore;
using Resonance.Api.Data;
using Resonance.Api.Models;
using Resonance.DTOs;

namespace Resonance.Services;

public class PlaylistService : IPlaylistService
{
    private readonly AppDbContext _context;
    private const string DefaultCoverUrl = "https://resonance.app/assets/default-cover.png";
    private static readonly ConcurrentDictionary<Guid, Playlist> _inMemoryPlaylists = new();

    public PlaylistService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PlaylistResponseDto> CreateAsync(string userId, CreatePlaylistDto dto)
    {
        var playlist = new Playlist
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Name = dto.Name.Trim(),
            CoverImageUrl = string.IsNullOrWhiteSpace(dto.CoverImageUrl)
                ? DefaultCoverUrl
                : dto.CoverImageUrl.Trim(),
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        try
        {
            _context.Playlists.Add(playlist);
            await _context.SaveChangesAsync();
        }
        catch
        {
            // Fallback en memoria si Postgres está desconectado
            _inMemoryPlaylists[playlist.Id] = playlist;
        }

        return MapToDto(playlist);
    }

    public async Task<IEnumerable<PlaylistResponseDto>> GetUserPlaylistsAsync(string userId)
    {
        try
        {
            var list = await _context.Playlists
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

            if (list.Count > 0) return list;
        }
        catch
        {
            // Fallback a memoria
        }

        return _inMemoryPlaylists.Values
            .Where(p => p.UserId == userId)
            .OrderByDescending(p => p.CreatedAt)
            .Select(MapToDto);
    }

    public async Task<PlaylistResponseDto?> UpdateDetailsAsync(Guid id, string userId, UpdatePlaylistDto dto)
    {
        try
        {
            var playlist = await _context.Playlists.FirstOrDefaultAsync(p => p.Id == id);
            if (playlist != null)
            {
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
        }
        catch (UnauthorizedAccessException)
        {
            throw;
        }
        catch
        {
            // Fallback a memoria
        }

        if (_inMemoryPlaylists.TryGetValue(id, out var memPl))
        {
            if (memPl.UserId != userId)
            {
                throw new UnauthorizedAccessException("No tienes permisos para editar esta playlist.");
            }

            if (!string.IsNullOrWhiteSpace(dto.Name))
            {
                memPl.Name = dto.Name.Trim();
            }

            if (dto.CoverImageUrl != null)
            {
                memPl.CoverImageUrl = string.IsNullOrWhiteSpace(dto.CoverImageUrl) 
                    ? DefaultCoverUrl 
                    : dto.CoverImageUrl.Trim();
            }

            memPl.UpdatedAt = DateTime.UtcNow;
            return MapToDto(memPl);
        }

        return null;
    }

    private static PlaylistResponseDto MapToDto(Playlist p)
    {
        return new PlaylistResponseDto(p.Id, p.UserId, p.Name, p.CoverImageUrl, p.CreatedAt, p.UpdatedAt);
    }
}
