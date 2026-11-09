namespace Resonance.Api.Models;

public class User
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public string Name { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string PasswordHash { get; set; } = string.Empty;
    public bool IsConfirmed { get; set; } = false;
    public string? ConfirmationToken { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
