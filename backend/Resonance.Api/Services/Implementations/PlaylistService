using Microsoft.EntityFrameworkCore;
using Resonance.Data;
using Resonance.DTOs;
using Resonance.Models;

namespace Resonance.Services
{
    public class PlaylistService
    {
        private readonly AppDbContext _context;

        public PlaylistService(AppDbContext context) => _context = context;

        public async Task<PlaylistResponseDto> CreateAsync(string userId, CreatePlaylistDto dto)
        {
            var playlist = new Playlist
            {
                UserId = userId,
                Name = dto.Name.Trim(),
                CoverImageUrl = string.IsNullOrWhiteSpace(dto.CoverImageUrl)
                    ? "https://resonance.app/assets/default-cover.png"
                    : dto.CoverImageUrl.Trim()
            };

            _context.Playlists.Add(playlist);
            await _context.SaveChangesAsync();

            return new PlaylistResponseDto(playlist.Id, playlist.UserId, playlist.Name, playlist.CoverImageUrl, playlist.CreatedAt);
        }
    }
}
