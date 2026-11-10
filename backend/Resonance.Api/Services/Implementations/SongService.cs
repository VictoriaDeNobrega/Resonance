using Microsoft.EntityFrameworkCore;
using Resonance.Api.Data;
using Resonance.Api.DTOs.Songs;
using Resonance.Api.Models;
using Resonance.Api.Services.Interfaces;

public class SongService :  ISongService
{
    private readonly AppDbContext _context;

    public SongService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<IEnumerable<Song>> GetFilteredSongsAsync(SongFilterDto filters)
    {
        var query = _context.Songs.AsQueryable();

        if (!string.IsNullOrWhiteSpace(filters.SearchTerm))
        {
            var term = filters.SearchTerm.ToLower();
            query = query.Where(s => 
                s.Title.ToLower().Contains(term) || 
                s.Artist.ToLower().Contains(term) || 
                s.Album.ToLower().Contains(term));
        }

        if (!string.IsNullOrWhiteSpace(filters.Artist))
        {
            query = query.Where(s => s.Artist.ToLower().Contains(filters.Artist.ToLower()));
        }

        if (!string.IsNullOrWhiteSpace(filters.Album))
        {
            query = query.Where(s => s.Album.ToLower().Contains(filters.Album.ToLower()));
        }

        return await query.ToListAsync();
    }
}