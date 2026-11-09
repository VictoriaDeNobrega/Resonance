using Microsoft.AspNetCore.Mvc;
using Resonance.Api.DTOs.Rooms;
using Resonance.Api.Services.Interfaces;

namespace Resonance.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class RoomsController : ControllerBase
{
    private readonly IRoomService _roomService;

    public RoomsController(IRoomService roomService)
    {
        _roomService = roomService;
    }

    [HttpPost]
    public async Task<IActionResult> CreateRoom([FromBody] CreateRoomDto dto)
    {
        if (!ModelState.IsValid)
        {
            return BadRequest(ModelState);
        }

        var createdRoom = await _roomService.CreateRoomAsync(dto);
        return CreatedAtAction(nameof(GetRoomByCode), new { code = createdRoom.Code }, createdRoom);
    }

    [HttpGet("{code}")]
    public async Task<IActionResult> GetRoomByCode(string code)
    {
        var room = await _roomService.GetRoomByCodeAsync(code);
        if (room == null)
        {
            return NotFound(new { message = $"La sala con código '{code}' no existe o ya fue cerrada." });
        }

        return Ok(room);
    }

    [HttpDelete("{code}")]
    public async Task<IActionResult> CloseRoom(string code, [FromQuery] string hostId)
    {
        var success = await _roomService.CloseRoomAsync(code, hostId);
        if (!success)
        {
            return NotFound(new { message = "No se pudo cerrar la sala o no se encontró." });
        }

        return Ok(new { message = "Sala cerrada exitosamente." });
    }
}
