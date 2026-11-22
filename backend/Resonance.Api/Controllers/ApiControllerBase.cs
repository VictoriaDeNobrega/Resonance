using Microsoft.AspNetCore.Mvc;
using Resonance.Api.DTOs;

namespace Resonance.Api.Controllers;

[ApiController]
public abstract class ApiControllerBase : ControllerBase
{
    protected IActionResult ToActionResult<T>(ServiceResult<T> result)
    {
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { message = result.Error });
        }

        return StatusCode(result.StatusCode, result.Data);
    }

    protected IActionResult ToMessageResult(ServiceResult<bool> result, string successMessage)
    {
        if (!result.Success)
        {
            return StatusCode(result.StatusCode, new { message = result.Error });
        }

        return Ok(new { message = successMessage });
    }
}
