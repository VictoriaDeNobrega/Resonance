using Microsoft.EntityFrameworkCore;
using Resonance.Api.Data;
using Resonance.Api.Models;
using Resonance.DTOs;

namespace Resonance.Services;

public class SongService : ISongService
{
    private readonly AppDbContext _context;

    private static readonly List<SongResponseDto> _defaultSongs = new()
    {
        new(Guid.Parse("11111111-1111-1111-1111-111111111111"), "Aimless", "Calva Louise", "Edge of the Abyss", "Alternative Rock", 215, "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3", "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80", 120),
        new(Guid.Parse("22222222-2222-2222-2222-222222222222"), "Barely A Response", "Calva Louise", "Edge of the Abyss", "Alternative Rock", 221, "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3", "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80", 98),
        new(Guid.Parse("33333333-3333-3333-3333-333333333333"), "El Umbral", "Calva Louise", "Edge of the Abyss", "Post-Punk", 249, "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3", "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?auto=format&fit=crop&w=600&q=80", 154),
        new(Guid.Parse("44444444-4444-4444-4444-444444444444"), "Midnight City", "M83", "Hurry Up, We're Dreaming", "Synthwave", 243, "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3", "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=600&q=80", 310),
        new(Guid.Parse("55555555-5555-5555-5555-555555555555"), "Harder, Better, Faster, Stronger", "Daft Punk", "Discovery", "Electronic", 224, "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-5.mp3", "https://images.unsplash.com/photo-1492684223066-81342ee5ff30?auto=format&fit=crop&w=600&q=80", 420)
    };

    public SongService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<PagedResultDto<SongResponseDto>> SearchSongsAsync(SongSearchFilterDto filter)
    {
        try
        {
            var query = _context.Songs.AsNoTracking().AsQueryable();

            if (!string.IsNullOrWhiteSpace(filter.Query))
            {
                var term = filter.Query.Trim().ToLower();
                query = query.Where(s =>
                    s.Title.ToLower().Contains(term) ||
                    s.Artist.ToLower().Contains(term) ||
                    s.Album.ToLower().Contains(term));
            }

            if (!string.IsNullOrWhiteSpace(filter.Genre))
            {
                var genreTerm = filter.Genre.Trim().ToLower();
                query = query.Where(s => s.Genre.ToLower() == genreTerm);
            }

            query = filter.SortBy?.ToLower() switch
            {
                "popular" => query.OrderByDescending(s => s.PlayCount),
                "recent" => query.OrderByDescending(s => s.CreatedAt),
                _ => query.OrderBy(s => s.Title)
            };

            int totalItems = await query.CountAsync();
            int pageSize = Math.Clamp(filter.PageSize, 1, 50);
            int page = Math.Max(filter.Page, 1);
            int totalPages = (int)Math.Ceiling((double)totalItems / pageSize);

            var items = await query
                .Skip((page - 1) * pageSize)
                .Take(pageSize)
                .Select(s => new SongResponseDto(
                    s.Id,
                    s.Title,
                    s.Artist,
                    s.Album,
                    s.Genre,
                    s.DurationInSeconds,
                    s.AudioUrl,
                    s.CoverImageUrl,
                    s.PlayCount
                ))
                .ToListAsync();

            if (items.Count > 0)
            {
                return new PagedResultDto<SongResponseDto>(items, totalItems, page, pageSize, totalPages);
            }
        }
        catch
        {
            // Fallback en memoria si Postgres no está conectado
        }

        var fallbackList = _defaultSongs.AsEnumerable();
        if (!string.IsNullOrWhiteSpace(filter.Query))
        {
            var term = filter.Query.Trim().ToLower();
            fallbackList = fallbackList.Where(s =>
                s.Title.ToLower().Contains(term) ||
                s.Artist.ToLower().Contains(term) ||
                s.Album.ToLower().Contains(term));
        }

        var results = fallbackList.ToList();
        return new PagedResultDto<SongResponseDto>(results, results.Count, 1, 20, 1);
    }

    public async Task<IEnumerable<SongResponseDto>> GetHomeSongsAsync(int limit = 10)
    {
        try
        {
            int safeLimit = Math.Clamp(limit, 1, 50);

            var list = await _context.Songs
                .AsNoTracking()
                .OrderByDescending(s => s.PlayCount)
                .Take(safeLimit)
                .Select(s => new SongResponseDto(
                    s.Id,
                    s.Title,
                    s.Artist,
                    s.Album,
                    s.Genre,
                    s.DurationInSeconds,
                    s.AudioUrl,
                    s.CoverImageUrl,
                    s.PlayCount
                ))
                .ToListAsync();

            if (list.Count > 0) return list;
        }
        catch
        {
            // Fallback a canciones demo en memoria
        }

        return _defaultSongs.Take(Math.Clamp(limit, 1, 50));
    }
}
