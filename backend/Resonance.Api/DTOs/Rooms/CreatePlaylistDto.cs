using System.ComponentModel.DataAnnotations;

namespace Resonance.DTOs
{
    public record CreatePlaylistDto(
        [Required(ErrorMessage = "El nombre es obligatorio")]
        [StringLength(60, ErrorMessage = "Máximo 60 caracteres")] string Name,
        string? CoverImageUrl
    );

    public record PlaylistResponseDto(Guid Id, string UserId, string Name, string CoverImageUrl, DateTime CreatedAt);
}
