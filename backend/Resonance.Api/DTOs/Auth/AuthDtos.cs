using System.ComponentModel.DataAnnotations;

namespace Resonance.Api.DTOs;

public class RegisterDto
{
    [Required]
    [MaxLength(100)]
    public string Name { get; set; } = string.Empty;

    [Required]
    [EmailAddress]
    [MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MinLength(8)]
    public string Password { get; set; } = string.Empty;
}

public class LoginDto
{
    [Required]
    [EmailAddress]
    [MaxLength(150)]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

public class UpdateUserDto
{
    [MaxLength(100)]
    public string? Name { get; set; }

    [EmailAddress]
    [MaxLength(150)]
    public string? Email { get; set; }

    public string? CurrentPassword { get; set; }

    [MinLength(8)]
    public string? NewPassword { get; set; }
}
