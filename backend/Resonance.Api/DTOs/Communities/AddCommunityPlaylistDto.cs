using System.ComponentModel.DataAnnotations;

namespace Resonance.Api.DTOs.Communities;

public class AddCommunityPlaylistDto
{
    [Required(ErrorMessage = "El identificador de la playlist es obligatorio.")]
    public string PlaylistId { get; set; } = string.Empty;

    [Required(ErrorMessage = "El título de la playlist es obligatorio.")]
    [MaxLength(150, ErrorMessage = "El título no puede exceder 150 caracteres.")]
    public string PlaylistTitle { get; set; } = string.Empty;

    [MaxLength(300, ErrorMessage = "La descripción no puede exceder 300 caracteres.")]
    public string? Description { get; set; }

    [MaxLength(500)]
    public string? CoverUrl { get; set; }

    public int SongCount { get; set; } = 0;
}

