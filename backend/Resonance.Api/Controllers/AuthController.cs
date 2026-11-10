using System.Collections.Concurrent;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Resonance.Api.Data;
using Resonance.Api.DTOs;
using Resonance.Api.Models;

namespace Resonance.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly AppDbContext _context;
    private readonly PasswordHasher<User> _passwordHasher = new();
    private static readonly ConcurrentDictionary<string, User> _inMemoryUsers = new(StringComparer.OrdinalIgnoreCase);

    public AuthController(AppDbContext context)
    {
        _context = context;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterDto model,
        CancellationToken cancellationToken)
    {
        var email = model.Email.Trim().ToLowerInvariant();

        try
        {
            if (await _context.Users.AnyAsync(
                    user => user.Email.ToLower() == email,
                    cancellationToken))
            {
                return Conflict(new { message = "El correo ya está registrado." });
            }

            var user = new User
            {
                Name = model.Name.Trim(),
                Email = email
            };
            user.PasswordHash = _passwordHasher.HashPassword(user, model.Password);

            _context.Users.Add(user);
            await _context.SaveChangesAsync(cancellationToken);

            return Ok(new { message = "¡Usuario registrado correctamente!", email = user.Email });
        }
        catch
        {
            // Fallback en memoria si Postgres está apagado
            if (_inMemoryUsers.ContainsKey(email))
            {
                return Conflict(new { message = "El correo ya está registrado." });
            }

            var user = new User
            {
                Name = model.Name.Trim(),
                Email = email
            };
            user.PasswordHash = _passwordHasher.HashPassword(user, model.Password);
            _inMemoryUsers[email] = user;

            return Ok(new { message = "¡Usuario registrado correctamente!", email = user.Email });
        }
    }

    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginDto model,
        CancellationToken cancellationToken)
    {
        var email = model.Email.Trim().ToLowerInvariant();

        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(
                candidate => candidate.Email.ToLower() == email,
                cancellationToken);

            if (user != null)
            {
                if (_passwordHasher.VerifyHashedPassword(user, user.PasswordHash, model.Password) ==
                    PasswordVerificationResult.Failed)
                {
                    return Unauthorized(new { message = "Correo o contraseña incorrectos." });
                }

                return Ok(new
                {
                    message = "¡Inicio de sesión exitoso!",
                    userId = user.Id,
                    name = user.Name,
                    email = user.Email
                });
            }
        }
        catch
        {
            // Fallback en memoria
        }

        if (_inMemoryUsers.TryGetValue(email, out var memUser))
        {
            if (_passwordHasher.VerifyHashedPassword(memUser, memUser.PasswordHash, model.Password) ==
                PasswordVerificationResult.Failed)
            {
                return Unauthorized(new { message = "Correo o contraseña incorrectos." });
            }

            return Ok(new
            {
                message = "¡Inicio de sesión exitoso!",
                userId = memUser.Id,
                name = memUser.Name,
                email = memUser.Email
            });
        }

        return Unauthorized(new { message = "Correo o contraseña incorrectos." });
    }

    [HttpPut("update/{id:guid}")]
    public async Task<IActionResult> UpdateUser(
        Guid id,
        [FromBody] UpdateUserDto model,
        CancellationToken cancellationToken)
    {
        try
        {
            var user = await _context.Users.FirstOrDefaultAsync(
                candidate => candidate.Id == id,
                cancellationToken);
            if (user != null)
            {
                var hasName = model.Name is not null;
                var hasEmail = model.Email is not null;
                var hasNewPassword = model.NewPassword is not null;
                if ((!hasName && !hasEmail && !hasNewPassword) ||
                    (hasName && string.IsNullOrWhiteSpace(model.Name)) ||
                    (hasEmail && string.IsNullOrWhiteSpace(model.Email)))
                {
                    return BadRequest(new { message = "Indica al menos un cambio válido." });
                }

                if (string.IsNullOrEmpty(model.CurrentPassword) ||
                    _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, model.CurrentPassword) ==
                    PasswordVerificationResult.Failed)
                {
                    return BadRequest(new { message = "La contraseña actual es incorrecta." });
                }

                if (hasEmail)
                {
                    var email = model.Email!.Trim().ToLowerInvariant();
                    if (await _context.Users.AnyAsync(
                            candidate => candidate.Id != id && candidate.Email.ToLower() == email,
                            cancellationToken))
                    {
                        return Conflict(new { message = "El correo ya está registrado." });
                    }

                    user.Email = email;
                }

                if (hasName) user.Name = model.Name!.Trim();
                if (hasNewPassword) user.PasswordHash = _passwordHasher.HashPassword(user, model.NewPassword!);

                await _context.SaveChangesAsync(cancellationToken);
                return Ok(new
                {
                    message = "¡Perfil actualizado con éxito!",
                    name = user.Name,
                    email = user.Email
                });
            }
        }
        catch
        {
            // Fallback en memoria
        }

        var inMem = _inMemoryUsers.Values.FirstOrDefault(u => u.Id == id);
        if (inMem == null) return NotFound(new { message = "Usuario no encontrado." });

        if (string.IsNullOrEmpty(model.CurrentPassword) ||
            _passwordHasher.VerifyHashedPassword(inMem, inMem.PasswordHash, model.CurrentPassword) ==
            PasswordVerificationResult.Failed)
        {
            return BadRequest(new { message = "La contraseña actual es incorrecta." });
        }

        if (model.Name != null) inMem.Name = model.Name.Trim();
        if (model.NewPassword != null) inMem.PasswordHash = _passwordHasher.HashPassword(inMem, model.NewPassword);

        return Ok(new
        {
            message = "¡Perfil actualizado con éxito!",
            name = inMem.Name,
            email = inMem.Email
        });
    }
}
