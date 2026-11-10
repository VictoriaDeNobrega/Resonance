using System.ComponentModel.DataAnnotations;

namespace Resonance.DTOs
{
    public record CreatePlaylistDto(
        [Required(ErrorMessage = "El nombre de la playlist es obligatorio")]
        [StringLength(60, ErrorMessage = "El nombre no puede superar los 60 caracteres")] string Name,
        string? CoverImageUrl
    );

    public record UpdatePlaylistDto(
        [StringLength(60, ErrorMessage = "El nombre no puede superar los 60 caracteres")] string? Name,
        string? CoverImageUrl
    );

    public record PlaylistResponseDto(
        Guid Id, 
        string UserId, 
        string Name, 
        string CoverImageUrl, 
        DateTime CreatedAt, 
        DateTime UpdatedAt
    );
}
