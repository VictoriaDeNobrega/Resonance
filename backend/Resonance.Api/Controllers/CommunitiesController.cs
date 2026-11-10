using Microsoft.AspNetCore.Mvc;
using Resonance.Api.DTOs.Communities;
using Resonance.Api.Services.Interfaces;

namespace Resonance.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class CommunitiesController : ControllerBase
{
    private readonly ICommunityService _communityService;

    public CommunitiesController(ICommunityService communityService)
    {
        _communityService = communityService;
    }

    [HttpGet]
    public async Task<IActionResult> GetAll([FromQuery] string? search, [FromQuery] string? categoryType)
    {
        var list = await _communityService.GetAllAsync(search, categoryType);
        return Ok(list);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var community = await _communityService.GetByIdAsync(id);
        if (community == null)
        {
            return NotFound(new { message = "La comunidad solicitada no existe." });
        }
        return Ok(community);
    }

    [HttpGet("check-name")]
    public async Task<IActionResult> CheckName([FromQuery] string name, [FromQuery] Guid? excludeId)
    {
        var exists = await _communityService.ExistsNameAsync(name, excludeId);
        return Ok(new { available = !exists });
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateCommunityDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var created = await _communityService.CreateAsync(dto);
            return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateCommunityDto dto,
        [FromHeader(Name = "X-User-Id")] string? headerUserId,
        [FromQuery] string? userId)
    {
        var requestingUser = !string.IsNullOrWhiteSpace(headerUserId) ? headerUserId : userId;

        if (string.IsNullOrWhiteSpace(requestingUser))
        {
            return Unauthorized(new { message = "Debe identificarse para modificar la comunidad." });
        }

        if (string.IsNullOrWhiteSpace(dto.Name))
        {
            return BadRequest(new { message = "El campo Nombre no puede estar vacío." });
        }

        if (string.IsNullOrWhiteSpace(dto.CategoryValue))
        {
            return BadRequest(new { message = "El campo Género/Artista no puede estar vacío." });
        }

        try
        {
            var updated = await _communityService.UpdateAsync(id, dto, requestingUser);
            return Ok(updated);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(
        Guid id,
        [FromHeader(Name = "X-User-Id")] string? headerUserId,
        [FromQuery] string? userId)
    {
        var requestingUser = !string.IsNullOrWhiteSpace(headerUserId) ? headerUserId : userId;
        if (string.IsNullOrWhiteSpace(requestingUser))
        {
            return Unauthorized(new { message = "Debe identificarse para eliminar la comunidad." });
        }

        try
        {
            var success = await _communityService.DeleteAsync(id, requestingUser);
            if (!success)
            {
                return NotFound(new { message = "La comunidad no existe." });
            }
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/playlists")]
    public async Task<IActionResult> AddPlaylist(
        Guid id,
        [FromBody] AddCommunityPlaylistDto dto,
        [FromHeader(Name = "X-User-Id")] string? headerUserId,
        [FromQuery] string? userId)
    {
        var requestingUser = !string.IsNullOrWhiteSpace(headerUserId) ? headerUserId : userId;
        if (string.IsNullOrWhiteSpace(requestingUser))
        {
            return Unauthorized(new { message = "Debe identificarse para agregar playlists a la comunidad." });
        }

        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        try
        {
            var result = await _communityService.AddPlaylistAsync(id, dto, requestingUser);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { message = ex.Message });
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
        catch (InvalidOperationException ex)
        {
            // Escenario 4: "Esta playlist ya está agregada a la comunidad."
            return BadRequest(new { message = ex.Message });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { message = ex.Message });
        }
    }

    [HttpDelete("{id:guid}/playlists/{playlistId}")]
    public async Task<IActionResult> RemovePlaylist(
        Guid id,
        string playlistId,
        [FromHeader(Name = "X-User-Id")] string? headerUserId,
        [FromQuery] string? userId)
    {
        var requestingUser = !string.IsNullOrWhiteSpace(headerUserId) ? headerUserId : userId;
        if (string.IsNullOrWhiteSpace(requestingUser))
        {
            return Unauthorized(new { message = "Debe identificarse para gestionar playlists." });
        }

        try
        {
            var success = await _communityService.RemovePlaylistAsync(id, playlistId, requestingUser);
            if (!success)
            {
                return NotFound(new { message = "La playlist no se encontró en la comunidad." });
            }
            return NoContent();
        }
        catch (UnauthorizedAccessException ex)
        {
            return StatusCode(StatusCodes.Status403Forbidden, new { message = ex.Message });
        }
    }
}

