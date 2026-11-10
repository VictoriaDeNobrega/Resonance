using System.ComponentModel.DataAnnotations;

namespace Resonance.Api.DTOs.Communities;

public class UpdateCommunityDto
{
    [Required(ErrorMessage = "El campo Nombre no puede estar vacío.")]
    [MinLength(1, ErrorMessage = "El campo Nombre no puede estar vacío.")]
    [MaxLength(100, ErrorMessage = "El nombre no puede exceder 100 caracteres")]
    public string Name { get; set; } = string.Empty;

    [MaxLength(500, ErrorMessage = "La descripción no puede superar los 500 caracteres")]
    public string Description { get; set; } = string.Empty;

    public string CategoryType { get; set; } = "Genre";

    [Required(ErrorMessage = "El campo Género/Artista no puede estar vacío.")]
    [MinLength(1, ErrorMessage = "El campo Género/Artista no puede estar vacío.")]
    [MaxLength(100, ErrorMessage = "El género/artista no puede exceder 100 caracteres")]
    public string CategoryValue { get; set; } = string.Empty;

    public string? BannerUrl { get; set; }
}

