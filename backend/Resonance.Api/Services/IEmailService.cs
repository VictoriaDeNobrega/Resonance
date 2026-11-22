using Resonance.Api.Models;

namespace Resonance.Api.Services;

public interface IEmailService
{
    bool IsValidEmail(string email);
    string GenerateConfirmationToken();
    bool ValidateConfirmationTokenFormat(string? token);
    Task SendConfirmationEmailAsync(string recipientEmail, string recipientName, string confirmationToken, CancellationToken ct = default);
    string GenerateSessionToken(User user);
    bool ValidateSessionToken(string token, out Guid userId);
}
