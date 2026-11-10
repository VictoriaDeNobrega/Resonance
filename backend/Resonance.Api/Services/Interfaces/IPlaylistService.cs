using Resonance.DTOs;

namespace Resonance.Services
{
    public interface IPlaylistService
    {
        /// <summary>
        /// Crea una nueva playlist personal asignada al usuario.
        /// </summary>
        Task<PlaylistResponseDto> CreateAsync(string userId, CreatePlaylistDto dto);

        /// <summary>
        /// Obtiene todas las playlists pertenecientes a un usuario.
        /// </summary>
        Task<IEnumerable<PlaylistResponseDto>> GetUserPlaylistsAsync(string userId);

        /// <summary>
        /// Modifica el nombre o la imagen de portada de una playlist existente.
        /// </summary>
        Task<PlaylistResponseDto?> UpdateDetailsAsync(Guid id, string userId, UpdatePlaylistDto dto);
    }
}