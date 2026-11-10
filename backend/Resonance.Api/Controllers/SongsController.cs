using Microsoft.AspNetCore.Mvc;
using Resonance.Api.DTOs.Songs;
using Resonance.Api.Services.Interfaces;
using Resonance.Api.Models;

namespace Resonance.Api.Controllers
{
    /// <summary>
    /// Controlador para la gestión de canciones.
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class SongsController : ControllerBase
    {
        private readonly ISongService _songService;
        private readonly ILogger<SongsController> _logger;

        public SongsController(ISongService songService, ILogger<SongsController> logger)
        {
            _songService = songService;
            _logger = logger;
        }

        /// <summary>
        /// Obtiene una lista de canciones filtrada por diversos criterios.
        /// </summary>
        /// <param name="filters">Filtros de búsqueda (término, artista, álbum, género).</param>
        /// <returns>Lista de canciones que coinciden con los criterios.</returns>
        [HttpGet]
        [ProducesResponseType(typeof(IEnumerable<Song>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<Song>>> GetSongs([FromQuery] SongFilterDto filters)
        {
            try
            {
                var songs = await _songService.GetFilteredSongsAsync(filters);
                return Ok(songs);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error al obtener canciones con filtros: {@Filters}", filters);
                return StatusCode(500, "Ocurrió un error interno al procesar la solicitud.");
            }
        }
        
        // Se sugiere implementar GetById si el servicio lo soporta:
        // [HttpGet("{id}")]
        // public async Task<ActionResult<Song>> GetById(Guid id) ...
    }
}