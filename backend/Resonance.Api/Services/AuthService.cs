using Microsoft.AspNetCore.Identity;
using Resonance.Api.Data;
using Resonance.Api.DTOs;
using Resonance.Api.Models;

namespace Resonance.Api.Services;

public class AuthService : IAuthService
{
    private readonly UserRepository _userRepository;
    private readonly IEmailService _emailService;
    private readonly PasswordHasher<User> _passwordHasher = new();

    public AuthService(UserRepository userRepository, IEmailService emailService)
    {
        _userRepository = userRepository;
        _emailService = emailService;
    }

    public async Task<ServiceResult<RegisterResponseDto>> RegisterAsync(RegisterRequestDto dto, CancellationToken ct = default)
    {
        var name = dto.Name?.Trim() ?? string.Empty;
        var email = dto.Email?.Trim().ToLowerInvariant() ?? string.Empty;
        var password = dto.Password ?? string.Empty;

        if (name.Length < 2 || name.Length > 120)
            return ServiceResult<RegisterResponseDto>.BadRequest("El nombre debe tener entre 2 y 120 caracteres.");
        if (!_emailService.IsValidEmail(email))
            return ServiceResult<RegisterResponseDto>.BadRequest("El correo electrónico no tiene un formato válido.");
        if (password.Length < 6)
            return ServiceResult<RegisterResponseDto>.BadRequest("La contraseña debe tener al menos 6 caracteres.");
        if (await _userRepository.EmailExistsAsync(email, excludeUserId: null, ct))
            return ServiceResult<RegisterResponseDto>.Conflict("Ya existe una cuenta registrada con ese correo electrónico.");

        var confirmationToken = _emailService.GenerateConfirmationToken();
        var user = new User
        {
            Id = Guid.NewGuid(), Name = name, Email = email,
            AvatarUrl = string.IsNullOrWhiteSpace(dto.AvatarUrl) ? $"https://api.dicebear.com/9.x/thumbs/svg?seed={Uri.EscapeDataString(name)}" : dto.AvatarUrl.Trim(),
            Bio = dto.Bio?.Trim() ?? string.Empty, IsConfirmed = false, ConfirmationToken = confirmationToken,
            PreferredVolume = 0.8, ActiveView = "discover", CreatedAt = DateTime.UtcNow
        };
        user.PasswordHash = _passwordHasher.HashPassword(user, password);

        await _userRepository.AddAsync(user, ct);
        await _emailService.SendConfirmationEmailAsync(user.Email, user.Name, confirmationToken, ct);

        return ServiceResult<RegisterResponseDto>.Created(new RegisterResponseDto
        {
            User = await BuildProfileAsync(user, ct),
            ConfirmationToken = confirmationToken,
            Message = "Cuenta creada exitosamente. Confirma tu correo usando el token de verificación."
        });
    }

    public async Task<ServiceResult<UserProfileDto>> ConfirmAccountAsync(ConfirmAccountRequestDto dto, CancellationToken ct = default)
    {
        var token = dto.Token?.Trim().ToLowerInvariant() ?? string.Empty;
        if (!_emailService.ValidateConfirmationTokenFormat(token))
            return ServiceResult<UserProfileDto>.BadRequest("Token de confirmación inválido o expirado.");

        var normalizedEmail = string.IsNullOrWhiteSpace(dto.Email) ? null : dto.Email.Trim().ToLowerInvariant();
        var user = await _userRepository.GetByConfirmationTokenAsync(token, normalizedEmail, ct);
        if (user is null) return ServiceResult<UserProfileDto>.BadRequest("Token de confirmación inválido o expirado.");

        user.IsConfirmed = true;
        user.ConfirmationToken = null;
        await _userRepository.SaveChangesAsync(ct);
        return ServiceResult<UserProfileDto>.Ok(await BuildProfileAsync(user, ct));
    }

    public async Task<ServiceResult<LoginResponseDto>> LoginAsync(LoginRequestDto dto, CancellationToken ct = default)
    {
        var email = dto.Email?.Trim().ToLowerInvariant() ?? string.Empty;
        var password = dto.Password ?? string.Empty;
        if (string.IsNullOrWhiteSpace(email) || string.IsNullOrWhiteSpace(password))
            return ServiceResult<LoginResponseDto>.BadRequest("Debes proporcionar correo electrónico y contraseña.");

        var user = await _userRepository.GetByEmailAsync(email, track: true, ct);
        if (user is null) return ServiceResult<LoginResponseDto>.Unauthorized("Credenciales inválidas.");

        var verification = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, password);
        if (verification == PasswordVerificationResult.Failed) return ServiceResult<LoginResponseDto>.Unauthorized("Credenciales inválidas.");
        if (!user.IsConfirmed) return ServiceResult<LoginResponseDto>.Forbidden("Tu cuenta aún no ha sido confirmada. Confirma tu cuenta usando el token enviado.");

        if (verification == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.PasswordHash = _passwordHasher.HashPassword(user, password);
            await _userRepository.SaveChangesAsync(ct);
        }

        return ServiceResult<LoginResponseDto>.Ok(new LoginResponseDto
        {
            Token = _emailService.GenerateSessionToken(user),
            User = await BuildProfileAsync(user, ct),
            Message = "Inicio de sesión exitoso."
        });
    }

    public async Task<ServiceResult<UserProfileDto>> GetProfileAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, track: false, ct);
        return user is null
            ? ServiceResult<UserProfileDto>.NotFound("Usuario no encontrado.")
            : ServiceResult<UserProfileDto>.Ok(await BuildProfileAsync(user, ct));
    }

    public async Task<ServiceResult<UserProfileDto>> UpdateProfileAsync(Guid userId, UpdateProfileRequestDto dto, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, track: true, ct);
        if (user is null) return ServiceResult<UserProfileDto>.NotFound("Usuario no encontrado.");

        var nameChanged = false;
        if (dto.Name is not null)
        {
            var trimmedName = dto.Name.Trim();
            if (trimmedName.Length < 2 || trimmedName.Length > 120)
                return ServiceResult<UserProfileDto>.BadRequest("El nombre debe tener entre 2 y 120 caracteres.");
            if (!string.Equals(user.Name, trimmedName, StringComparison.Ordinal)) { user.Name = trimmedName; nameChanged = true; }
        }

        if (dto.Email is not null)
        {
            var normalizedEmail = dto.Email.Trim().ToLowerInvariant();
            if (!_emailService.IsValidEmail(normalizedEmail))
                return ServiceResult<UserProfileDto>.BadRequest("El correo electrónico no tiene un formato válido.");
            if (!string.Equals(user.Email, normalizedEmail, StringComparison.Ordinal))
            {
                if (await _userRepository.EmailExistsAsync(normalizedEmail, excludeUserId: userId, ct))
                    return ServiceResult<UserProfileDto>.Conflict("Ese correo electrónico ya está en uso por otra cuenta.");
                user.Email = normalizedEmail;
            }
        }

        if (dto.AvatarUrl is not null) user.AvatarUrl = dto.AvatarUrl.Trim();
        if (dto.Bio is not null)
        {
            var trimmedBio = dto.Bio.Trim();
            if (trimmedBio.Length > 500) return ServiceResult<UserProfileDto>.BadRequest("La biografía no puede superar los 500 caracteres.");
            user.Bio = trimmedBio;
        }

        if (!string.IsNullOrWhiteSpace(dto.NewPassword))
        {
            if (dto.NewPassword.Length < 6) return ServiceResult<UserProfileDto>.BadRequest("La nueva contraseña debe tener al menos 6 caracteres.");
            if (!string.IsNullOrWhiteSpace(dto.CurrentPassword) &&
                _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, dto.CurrentPassword) == PasswordVerificationResult.Failed)
                return ServiceResult<UserProfileDto>.BadRequest("La contraseña actual es incorrecta.");
            user.PasswordHash = _passwordHasher.HashPassword(user, dto.NewPassword);
        }

        await _userRepository.SaveProfileWithNameCascadeAsync(user, nameChanged, ct);
        return ServiceResult<UserProfileDto>.Ok(await BuildProfileAsync(user, ct));
    }

    public async Task<ServiceResult<UserProfileDto>> UpdateSessionStateAsync(Guid userId, SessionStateUpdateDto dto, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, track: true, ct);
        if (user is null) return ServiceResult<UserProfileDto>.NotFound("Usuario no encontrado.");

        var validatedSongId = dto.LastPlayedSongId;
        if (validatedSongId is { } sid && sid != Guid.Empty && !await _userRepository.SongExistsAsync(sid, ct))
            validatedSongId = null;

        user.UpdateSessionState(validatedSongId, dto.LastPlaybackPositionMs, dto.PreferredVolume, dto.ActiveView, dto.ActiveRoomCode, dto.ClearActiveRoom);
        await _userRepository.SaveChangesAsync(ct);
        return ServiceResult<UserProfileDto>.Ok(await BuildProfileAsync(user, ct));
    }

    public async Task<ServiceResult<bool>> LogoutAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _userRepository.GetByIdAsync(userId, track: true, ct);
        if (user is null) return ServiceResult<bool>.NotFound("Usuario no encontrado.");
        user.ActiveRoomCode = null;
        await _userRepository.SaveChangesAsync(ct);
        return ServiceResult<bool>.Ok(true);
    }

    public Task<List<UserSearchItemDto>> SearchUsersAsync(string? query, int limit = 20, CancellationToken ct = default) =>
        _userRepository.SearchByPrefixAsync(query, limit, ct);

    private async Task<UserProfileDto> BuildProfileAsync(User user, CancellationToken ct)
    {
        var (playlists, favorites, communities) = await _userRepository.GetProfileCountsAsync(user.Id, ct);
        return UserProfileDto.FromEntity(user, playlists, favorites, communities);
    }
}
