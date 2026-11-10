using Resonance.Api.DTOs.Songs;
using Resonance.Api.Models;

namespace Resonance.Api.Services.Interfaces
{
    public interface ISongService
    {
        /// <summary>
        /// Obtiene una lista de canciones filtradas por término general (título, artista, álbum) o filtros específicos.
        /// </summary>
        Task<IEnumerable<Song>> GetFilteredSongsAsync(SongFilterDto filters);
    }
}