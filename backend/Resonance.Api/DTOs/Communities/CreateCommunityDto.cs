using System.ComponentModel.DataAnnotations;

namespace Resonance.Api.DTOs.Communities;

public class CreateCommunityDto
{
    [Required(ErrorMessage = "El nombre de la comunidad es obligatorio")]
    [MinLength(3, ErrorMessage = "El nombre debe tener al menos 3 caracteres")]
    [MaxLength(100, ErrorMessage = "El nombre no puede exceder 100 caracteres")]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500, ErrorMessage = "La descripción no puede superar los 500 caracteres")]
    public string Description { get; set; } = string.Empty;

    [Required(ErrorMessage = "El tipo de comunidad es obligatorio")]
    public string CategoryType { get; set; } = "Genre"; // "Genre" o "Artist"

    [Required(ErrorMessage = "El valor del género o artista asociado es obligatorio")]
    [MaxLength(100, ErrorMessage = "El género/artista no puede exceder 100 caracteres")]
    public string CategoryValue { get; set; } = string.Empty;

    [Required(ErrorMessage = "El identificador del creador es obligatorio")]
    public string CreatorId { get; set; } = string.Empty;

    public string? CreatorName { get; set; }

    public string? BannerUrl { get; set; }
}

