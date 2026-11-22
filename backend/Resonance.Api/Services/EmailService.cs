using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Resonance.Api.Models;

namespace Resonance.Api.Services;

public class EmailService : IEmailService
{
    private static readonly Regex EmailPattern = new(@"^[^@\s]+@[^@\s]+\.[^@\s]+$", RegexOptions.IgnoreCase | RegexOptions.Compiled);
    private static readonly Regex TokenPattern = new(@"^[a-f0-9]{16,128}$", RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private readonly string _signingSecret;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _signingSecret = configuration["Auth:SigningSecret"]
            ?? "Resonance-v2-UCAB-PostgreSQL16-CapaZero-HMAC-Key-2026";
        _logger = logger;
    }

    public bool IsValidEmail(string email) =>
        !string.IsNullOrWhiteSpace(email) && EmailPattern.IsMatch(email);

    public string GenerateConfirmationToken() =>
        Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();

    public bool ValidateConfirmationTokenFormat(string? token) =>
        !string.IsNullOrWhiteSpace(token) && TokenPattern.IsMatch(token.Trim());

    public Task SendConfirmationEmailAsync(
        string recipientEmail,
        string recipientName,
        string confirmationToken,
        CancellationToken ct = default)
    {
        _logger.LogInformation(
            "[Control Email] Token de verificación generado para {Name} <{Email}>: {Token}",
            recipientName,
            recipientEmail,
            confirmationToken);

        return Task.CompletedTask;
    }

    public string GenerateSessionToken(User user)
    {
        var issuedAt = DateTimeOffset.UtcNow.ToUnixTimeSeconds();
        var nonce = Convert.ToHexString(RandomNumberGenerator.GetBytes(8)).ToLowerInvariant();
        var payload = $"{user.Id:N}.{issuedAt}.{nonce}";
        var encodedPayload = ToBase64Url(Encoding.UTF8.GetBytes(payload));
        var signature = ComputeSignature(payload);
        return $"res_{encodedPayload}.{signature}";
    }

    public bool ValidateSessionToken(string token, out Guid userId)
    {
        userId = Guid.Empty;
        if (string.IsNullOrWhiteSpace(token) || !token.StartsWith("res_", StringComparison.Ordinal))
        {
            return false;
        }

        var parts = token[4..].Split('.', 2);
        if (parts.Length != 2)
        {
            return false;
        }

        try
        {
            var payload = Encoding.UTF8.GetString(FromBase64Url(parts[0]));
            var expectedSignature = ComputeSignature(payload);
            if (!CryptographicOperations.FixedTimeEquals(
                    Encoding.UTF8.GetBytes(expectedSignature),
                    Encoding.UTF8.GetBytes(parts[1])))
            {
                return false;
            }

            var segments = payload.Split('.');
            return segments.Length == 3 && Guid.TryParseExact(segments[0], "N", out userId);
        }
        catch
        {
            return false;
        }
    }

    private string ComputeSignature(string payload)
    {
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(_signingSecret));
        return ToBase64Url(hmac.ComputeHash(Encoding.UTF8.GetBytes(payload)));
    }

    private static string ToBase64Url(byte[] data) =>
        Convert.ToBase64String(data).TrimEnd('=').Replace('+', '-').Replace('/', '_');

    private static byte[] FromBase64Url(string value)
    {
        var padded = value.Replace('-', '+').Replace('_', '/');
        var mod = padded.Length % 4;
        if (mod > 0) padded = padded.PadRight(padded.Length + (4 - mod), '=');
        return Convert.FromBase64String(padded);
    }
}
