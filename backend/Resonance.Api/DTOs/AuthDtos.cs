using System.ComponentModel.DataAnnotations;
using Resonance.Api.Models;

namespace Resonance.Api.DTOs;

public class RegisterRequestDto
{
    [Required(ErrorMessage = "El nombre es obligatorio.")]
    [StringLength(120, MinimumLength = 2, ErrorMessage = "El nombre debe tener entre 2 y 120 caracteres.")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "El correo electrónico es obligatorio.")]
    [EmailAddress(ErrorMessage = "El formato del correo electrónico no es válido.")]
    [StringLength(200)]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "La contraseña es obligatoria.")]
    [StringLength(128, MinimumLength = 6, ErrorMessage = "La contraseña debe tener al menos 6 caracteres.")]
    public string Password { get; set; } = string.Empty;

    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
}

public class ConfirmAccountRequestDto
{
    public string? Email { get; set; }

    [Required(ErrorMessage = "El token de confirmación es obligatorio.")]
    public string Token { get; set; } = string.Empty;
}

public class LoginRequestDto
{
    [Required(ErrorMessage = "El correo electrónico es obligatorio.")]
    [EmailAddress(ErrorMessage = "El formato del correo electrónico no es válido.")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "La contraseña es obligatoria.")]
    public string Password { get; set; } = string.Empty;
}

public class UpdateProfileRequestDto
{
    public string? Name { get; set; }
    public string? Email { get; set; }
    public string? AvatarUrl { get; set; }
    public string? Bio { get; set; }
    public string? CurrentPassword { get; set; }
    public string? NewPassword { get; set; }
}

public class SessionStateUpdateDto
{
    public Guid? LastPlayedSongId { get; set; }
    public long? LastPlaybackPositionMs { get; set; }
    public double? PreferredVolume { get; set; }
    public string? ActiveView { get; set; }
    public string? ActiveRoomCode { get; set; }
    public bool ClearActiveRoom { get; set; }
}

public class UserProfileDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public string Bio { get; set; } = string.Empty;
    public bool IsConfirmed { get; set; }
    public Guid? LastPlayedSongId { get; set; }
    public long LastPlaybackPositionMs { get; set; }
    public double PreferredVolume { get; set; }
    public string ActiveView { get; set; } = "discover";
    public string? ActiveRoomCode { get; set; }
    public DateTime CreatedAt { get; set; }
    public int PlaylistsCount { get; set; }
    public int FavoritesCount { get; set; }
    public int CommunitiesCount { get; set; }

    public static UserProfileDto FromEntity(User u, int playlistsCount, int favoritesCount, int communitiesCount) => new()
    {
        Id = u.Id,
        Name = u.Name,
        Email = u.Email,
        AvatarUrl = u.AvatarUrl,
        Bio = u.Bio,
        IsConfirmed = u.IsConfirmed,
        LastPlayedSongId = u.LastPlayedSongId,
        LastPlaybackPositionMs = u.LastPlaybackPositionMs,
        PreferredVolume = u.PreferredVolume,
        ActiveView = u.ActiveView,
        ActiveRoomCode = u.ActiveRoomCode,
        CreatedAt = u.CreatedAt,
        PlaylistsCount = playlistsCount,
        FavoritesCount = favoritesCount,
        CommunitiesCount = communitiesCount
    };
}

public class RegisterResponseDto
{
    public UserProfileDto User { get; set; } = null!;
    public string ConfirmationToken { get; set; } = string.Empty;
    public string Message { get; set; } = string.Empty;
}

public class LoginResponseDto
{
    public string Token { get; set; } = string.Empty;
    public UserProfileDto User { get; set; } = null!;
    public string Message { get; set; } = string.Empty;
}

public class UserSearchItemDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string AvatarUrl { get; set; } = string.Empty;
    public string Bio { get; set; } = string.Empty;
    public int PublicPlaylistsCount { get; set; }
}
