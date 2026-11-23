using System.Text.Json;
using Resonance.Api.DTOs;

namespace Resonance.Api.Services;

internal static class SubsonicParser
{
    public static (List<SubsonicTrackDto> Tracks, int RawCount) ParseTracks(
        string jsonContent,
        string baseUrl,
        string containerProp,
        string streamAuth,
        bool cleanArtistsOnly,
        HashSet<string> seen,
        int baseIndex)
    {
        var result = new List<SubsonicTrackDto>();
        using var doc = JsonDocument.Parse(jsonContent);
        if (!doc.RootElement.TryGetProperty("subsonic-response", out var sub) ||
            !string.Equals(GetString(sub, "status"), "ok", StringComparison.OrdinalIgnoreCase) ||
            !sub.TryGetProperty(containerProp, out var container) ||
            !container.TryGetProperty("song", out var songArray) ||
            songArray.ValueKind != JsonValueKind.Array)
        {
            return (result, 0);
        }

        var rawCount = songArray.GetArrayLength();
        var sourceServer = ResolveSourceServerName(baseUrl);
        var idx = baseIndex;

        foreach (var item in songArray.EnumerateArray())
        {
            var id = GetString(item, "id");
            var rawTitle = GetString(item, "title")?.Trim();
            if (string.IsNullOrWhiteSpace(id) || string.IsNullOrWhiteSpace(rawTitle) || !seen.Add(id))
                continue;

            var rawArtist = GetString(item, "artist")?.Trim();
            var isUnknownArtist = string.IsNullOrWhiteSpace(rawArtist) ||
                                  rawArtist.Equals("[Unknown Artist]", StringComparison.OrdinalIgnoreCase);

            var (title, artist) = NormalizeTitleAndArtist(rawTitle, rawArtist, isUnknownArtist);
            if (cleanArtistsOnly && artist == "Resonance Artist")
                continue;

            var rawAlbum = GetString(item, "album")?.Trim();
            var album = string.IsNullOrWhiteSpace(rawAlbum) ||
                        rawAlbum.Equals("[Unknown Album]", StringComparison.OrdinalIgnoreCase)
                ? "Resonance Stream"
                : rawAlbum;

            var duration = item.TryGetProperty("duration", out var dProp) && dProp.TryGetInt32(out var secs)
                ? Math.Max(0, secs)
                : 0;
            var coverArt = GetString(item, "coverArt")?.Trim() ?? id;
            var genre = InferGenre(GetString(item, "genre"), artist, album, title);

            result.Add(new SubsonicTrackDto(
                id,
                sourceServer,
                title,
                artist,
                album,
                genre,
                duration,
                $"{baseUrl}/rest/stream.view?id={Uri.EscapeDataString(id)}&{streamAuth}",
                !string.IsNullOrWhiteSpace(coverArt)
                    ? $"{baseUrl}/rest/getCoverArt.view?id={Uri.EscapeDataString(coverArt)}&size=600&{streamAuth}"
                    : string.Empty,
                $"Pista sincronizada en alta fidelidad desde {baseUrl} — Álbum: {album}.",
                Math.Max(12, 95 - (idx++ * 2))));
        }

        return (result, rawCount);
    }

    public static string ResolveSourceServerName(string baseUrl) =>
        baseUrl.Contains("musica.", StringComparison.OrdinalIgnoreCase) ? "musica" : "movil";

    public static string? GetString(JsonElement el, string prop) =>
        el.TryGetProperty(prop, out var value) ? value.GetString() : null;

    private static (string Title, string Artist) NormalizeTitleAndArtist(string rawTitle, string? rawArtist, bool isUnknownArtist)
    {
        var cleanTitle = System.Text.RegularExpressions.Regex.Replace(rawTitle, @"\s*\[[A-Za-z0-9_-]{8,15}\]\s*$", "").Trim();
        if (!isUnknownArtist)
            return (cleanTitle, rawArtist!);

        var parts = cleanTitle.Split(" - ", 2, StringSplitOptions.TrimEntries);
        if (parts.Length == 2 && !string.IsNullOrWhiteSpace(parts[0]) && !string.IsNullOrWhiteSpace(parts[1]))
        {
            if (parts[0].Contains("Calva Louise", StringComparison.OrdinalIgnoreCase))
                return (parts[1], parts[0]);
            return (parts[0], parts[1]);
        }

        return (cleanTitle, "Resonance Artist");
    }

    public static string InferGenre(string? rawGenre, string artist, string album, string title)
    {
        if (!string.IsNullOrWhiteSpace(rawGenre) &&
            !rawGenre.Equals("Music", StringComparison.OrdinalIgnoreCase) &&
            !rawGenre.Equals("Unknown", StringComparison.OrdinalIgnoreCase) &&
            !rawGenre.Equals("Other", StringComparison.OrdinalIgnoreCase))
        {
            return rawGenre.Trim();
        }

        var combined = $"{artist} {album} {title}";
        if (combined.Contains("Rammstein", StringComparison.OrdinalIgnoreCase)) return "Industrial Metal";
        if (combined.Contains("Kim Dracula", StringComparison.OrdinalIgnoreCase) ||
            combined.Contains("Casey Edwards", StringComparison.OrdinalIgnoreCase) ||
            combined.Contains("Bury the Light", StringComparison.OrdinalIgnoreCase)) return "Metal";
        if (combined.Contains("Nirvana", StringComparison.OrdinalIgnoreCase) ||
            combined.Contains("My Chemical Romance", StringComparison.OrdinalIgnoreCase)) return "Rock Alternativo";
        if (combined.Contains("Wham!", StringComparison.OrdinalIgnoreCase)) return "Pop";
        if (combined.Contains("Joji", StringComparison.OrdinalIgnoreCase)) return "R&B / Lo-Fi";
        if (combined.Contains("Calva Louise", StringComparison.OrdinalIgnoreCase) ||
            album.Contains("Edge of the Abyss", StringComparison.OrdinalIgnoreCase))
        {
            if (title.Contains("Corriente", StringComparison.OrdinalIgnoreCase) ||
                title.Contains("Umbral", StringComparison.OrdinalIgnoreCase) ||
                title.Contains("Lo Que Vale", StringComparison.OrdinalIgnoreCase)) return "Rock en Español";
            if (title.Contains("Tunnel Vision", StringComparison.OrdinalIgnoreCase) ||
                title.Contains("Impeccable", StringComparison.OrdinalIgnoreCase) ||
                title.Contains("Abyss", StringComparison.OrdinalIgnoreCase)) return "Electronic Rock";
            return "Alternative Rock";
        }
        if (combined.Contains("Heaven Pierce Her", StringComparison.OrdinalIgnoreCase) ||
            combined.Contains("Ultrakill", StringComparison.OrdinalIgnoreCase)) return "Electronic";
        if (combined.Contains("Jorge Rivera", StringComparison.OrdinalIgnoreCase) ||
            combined.Contains("EPIC", StringComparison.OrdinalIgnoreCase) ||
            combined.Contains("Savatteri", StringComparison.OrdinalIgnoreCase)) return "Soundtrack";
        if (combined.Contains("Stories from Styx", StringComparison.OrdinalIgnoreCase) ||
            combined.Contains("Casper Fox", StringComparison.OrdinalIgnoreCase)) return "Indie";

        return "Alternative Rock";
    }
}
