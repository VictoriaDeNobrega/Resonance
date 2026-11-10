using Microsoft.EntityFrameworkCore;
using Resonance.Data;
using Resonance.DTOs;

namespace Resonance.Services
{
    public class SongService : ISongService
    {
        private readonly AppDbContext _context;

        public SongService(AppDbContext context)
        {
            _context = context;
        }

        public async Task<PagedResultDto<SongResponseDto>> SearchSongsAsync(SongSearchFilterDto filter)
        {
            var query = _context.Songs.AsNoTracking().AsQueryable();

            // Filtrado por texto (Título, Artista o Álbum)
            if (!string.IsNullOrWhiteSpace(filter.Query))
            {
                var term = filter.Query.Trim().ToLower();
                query = query.Where(s =>
                    s.Title.ToLower().Contains(term) ||
                    s.Artist.ToLower().Contains(term) ||
                    s.Album.ToLower().Contains(term));
            }

            // Filtrado por Género
            if (!string.IsNullOrWhiteSpace(filter.Genre))
            {
                var genreTerm = filter.Genre.Trim().ToLower();
                query = query.Where(s => s.Genre.ToLower() == genreTerm);
            }

            // Ordenamiento
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

            return new PagedResultDto<SongResponseDto>(items, totalItems, page, pageSize, totalPages);
        }

        public async Task<IEnumerable<SongResponseDto>> GetHomeSongsAsync(int limit = 10)
        {
            int safeLimit = Math.Clamp(limit, 1, 50);

            return await _context.Songs
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
        }
    }
}
