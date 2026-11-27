using System.Net;
using System.Net.Mail;
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
    private readonly string _smtpHost;
    private readonly int _smtpPort;
    private readonly string _smtpUser;
    private readonly string _smtpPassword;
    private readonly string _fromName;
    private readonly string _frontendUrl;
    private readonly ILogger<EmailService> _logger;

    public EmailService(IConfiguration configuration, ILogger<EmailService> logger)
    {
        _signingSecret = configuration["Auth:SigningSecret"]
            ?? "Resonance-v2-UCAB-PostgreSQL16-CapaZero-HMAC-Key-2026";
        _smtpHost = (configuration["Smtp:Host"] ?? "smtp.gmail.com").Trim();
        _smtpPort = int.TryParse(configuration["Smtp:Port"], out var p) && p > 0 ? p : 587;
        _smtpUser = (configuration["Smtp:User"] ?? string.Empty).Trim();
        _smtpPassword = (configuration["Smtp:Password"] ?? string.Empty).Replace(" ", string.Empty).Trim();
        _fromName = (configuration["Smtp:FromName"] ?? "Resonance Música").Trim();
        _frontendUrl = (configuration["FrontendUrl"] ?? "https://musica.res0nance.pp.ua").TrimEnd('/');
        _logger = logger;
    }

    public bool IsValidEmail(string email) =>
        !string.IsNullOrWhiteSpace(email) && EmailPattern.IsMatch(email);

    public string GenerateConfirmationToken() =>
        Convert.ToHexString(RandomNumberGenerator.GetBytes(16)).ToLowerInvariant();

    public bool ValidateConfirmationTokenFormat(string? token) =>
        !string.IsNullOrWhiteSpace(token) && TokenPattern.IsMatch(token.Trim());

    public async Task SendConfirmationEmailAsync(
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

        if (string.IsNullOrWhiteSpace(_smtpUser) || string.IsNullOrWhiteSpace(_smtpPassword))
        {
            _logger.LogWarning("[Control Email] Smtp:User/Password no configurados; se omite envío real SMTP.");
            return;
        }

        try
        {
            var confirmUrl = $"{_frontendUrl}/login?confirmToken={Uri.EscapeDataString(confirmationToken)}&email={Uri.EscapeDataString(recipientEmail)}";
            var safeName = WebUtility.HtmlEncode(recipientName);
            using var msg = new MailMessage
            {
                From = new MailAddress(_smtpUser, _fromName),
                Subject = "Confirma tu cuenta en Resonance 🎵",
                IsBodyHtml = true,
                Body = $"""
                    <div style="font-family:Inter,Arial,sans-serif;background:#090b14;color:#f3f4f8;padding:32px;border-radius:16px;max-width:520px;margin:auto;border:1px solid rgba(139,92,246,0.35);">
                      <h2 style="margin:0 0 12px;color:#c4b5fd;">¡Bienvenido a Resonance, {safeName}!</h2>
                      <p style="color:#b8bfd6;line-height:1.6;">Haz clic en el botón para activar tu cuenta y entrar a las salas Jam sincronizadas:</p>
                      <p style="margin:24px 0;"><a href="{confirmUrl}" style="background:#7c3aed;color:#ffffff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:700;display:inline-block;">Confirmar mi cuenta</a></p>
                      <p style="color:#94a3b8;font-size:13px;">O copia tu token de confirmación manualmente:</p>
                      <code style="display:block;background:#14182a;padding:12px;border-radius:8px;color:#a78bfa;font-size:14px;letter-spacing:0.04em;">{confirmationToken}</code>
                    </div>
                    """
            };
            msg.To.Add(recipientEmail);

            using var smtp = new SmtpClient(_smtpHost, _smtpPort)
            {
                EnableSsl = true,
                DeliveryMethod = SmtpDeliveryMethod.Network,
                UseDefaultCredentials = false,
                Credentials = new NetworkCredential(_smtpUser, _smtpPassword),
                Timeout = 8000
            };
            await smtp.SendMailAsync(msg, ct);
            _logger.LogInformation("[Control Email] Correo SMTP enviado exitosamente a {Email}.", recipientEmail);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[Control Email] Falló el envío SMTP a {Email}; el registro continúa con fallback.", recipientEmail);
        }
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
