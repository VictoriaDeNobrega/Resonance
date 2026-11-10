namespace Resonance.Api.DTOs.Songs
{
    public class SongFilterDto
    {
        public string? SearchTerm { get; set; } // Busca en Title, Artist o Album
        public string? Artist { get; set; }
        public string? Album { get; set; }
        public string? Genre { get; set; }
    }
}