using Microsoft.AspNetCore.Mvc;
using Resonance.DTOs;
using Resonance.Services;

namespace Resonance.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class SongsController : ControllerBase
{
    private readonly ISongService _songService;

    public SongsController(ISongService songService)
    {
        _songService = songService;
    }

    [HttpGet("home")]
    public async Task<IActionResult> GetHomeSongs([FromQuery] int limit = 10)
    {
        var songs = await _songService.GetHomeSongsAsync(limit);
        return Ok(songs);
    }

    [HttpGet("search")]
    public async Task<IActionResult> SearchSongs([FromQuery] SongSearchFilterDto filter)
    {
        var result = await _songService.SearchSongsAsync(filter);
        return Ok(result);
    }
}
