using System.ComponentModel.DataAnnotations;

namespace Resonance.Api.DTOs.Rooms;

public class CreateRoomDto
{
    [Required(ErrorMessage = "El título de la sala es obligatorio")]
    [MinLength(3, ErrorMessage = "El título debe tener al menos 3 caracteres")]
    [MaxLength(100, ErrorMessage = "El título no puede exceder 100 caracteres")]
    public string Title { get; set; } = string.Empty;

    [Required(ErrorMessage = "El identificador o nombre del anfitrión es obligatorio")]
    public string HostName { get; set; } = string.Empty;
}
