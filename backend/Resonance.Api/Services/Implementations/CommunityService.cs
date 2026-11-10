using System.Net;
using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Resonance.Api.Data;
using Resonance.Api.DTOs.Communities;
using Resonance.Api.Models;
using Resonance.Api.Services.Interfaces;

namespace Resonance.Api.Services.Implementations;

public class CommunityService : ICommunityService
{
    private readonly AppDbContext _context;

    public CommunityService(AppDbContext context)
    {
        _context = context;
    }

    public async Task<List<CommunityDto>> GetAllAsync(string? search = null, string? categoryType = null)
    {
        var query = _context.Communities
            .AsNoTracking()
            .Include(c => c.Playlists)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(categoryType) &&
            Enum.TryParse<CommunityCategoryType>(categoryType, true, out var parsedType))
        {
            query = query.Where(c => c.CategoryType == parsedType);
        }

        if (!string.IsNullOrWhiteSpace(search))
        {
            var searchLower = search.Trim().ToLowerInvariant();
            query = query.Where(c =>
                c.NormalizedName.Contains(searchLower) ||
                c.CategoryValue.ToLower().Contains(searchLower) ||
                c.Description.ToLower().Contains(searchLower));
        }

        var list = await query
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();

        return list.Select(MapToDto).ToList();
    }

    public async Task<CommunityDto?> GetByIdAsync(Guid id)
    {
        var community = await _context.Communities
            .AsNoTracking()
            .Include(c => c.Playlists)
            .FirstOrDefaultAsync(c => c.Id == id);

        return community == null ? null : MapToDto(community);
    }

    public async Task<bool> ExistsNameAsync(string name, Guid? excludeId = null)
    {
        if (string.IsNullOrWhiteSpace(name)) return false;
        var normalized = NormalizeName(name);

        var query = _context.Communities.AsNoTracking().Where(c => c.NormalizedName == normalized);
        if (excludeId.HasValue)
        {
            query = query.Where(c => c.Id != excludeId.Value);
        }

        return await query.AnyAsync();
    }

    public async Task<CommunityDto> CreateAsync(CreateCommunityDto dto)
    {
        var cleanName = SanitizeText(dto.Name);
        var normalized = NormalizeName(cleanName);

        if (string.IsNullOrWhiteSpace(cleanName))
        {
            throw new ArgumentException("El campo Nombre no puede estar vacío.");
        }

        var cleanCategoryValue = SanitizeText(dto.CategoryValue);
        if (string.IsNullOrWhiteSpace(cleanCategoryValue))
        {
            throw new ArgumentException("El campo Género/Artista no puede estar vacío.");
        }

        // Validación de nombres no repetidos (insensible a mayúsculas/minúsculas)
        var exists = await _context.Communities.AnyAsync(c => c.NormalizedName == normalized);
        if (exists)
        {
            throw new InvalidOperationException($"Ya existe una comunidad con el nombre '{cleanName}'. Por favor elige otro nombre.");
        }

        var parsedCategoryType = Enum.TryParse<CommunityCategoryType>(dto.CategoryType, true, out var catType)
            ? catType
            : CommunityCategoryType.Genre;

        var community = new Community
        {
            Id = Guid.NewGuid(),
            Name = cleanName,
            NormalizedName = normalized,
            Description = SanitizeText(dto.Description),
            CategoryType = parsedCategoryType,
            CategoryValue = cleanCategoryValue,
            CreatorId = dto.CreatorId.Trim(),
            CreatorName = string.IsNullOrWhiteSpace(dto.CreatorName) ? dto.CreatorId.Trim() : dto.CreatorName.Trim(),
            BannerUrl = SanitizeUrl(dto.BannerUrl),
            MemberCount = 1,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        _context.Communities.Add(community);
        await _context.SaveChangesAsync();

        return MapToDto(community);
    }

    public async Task<CommunityDto> UpdateAsync(Guid id, UpdateCommunityDto dto, string requestingUserId)
    {
        var community = await _context.Communities
            .Include(c => c.Playlists)
            .FirstOrDefaultAsync(c => c.Id == id);

        if (community == null)
        {
            throw new KeyNotFoundException("La comunidad especificada no existe.");
        }

        // Verificación de rol Creador en servidor
        ValidateCreatorAccess(community, requestingUserId);

        var cleanName = SanitizeText(dto.Name);
        if (string.IsNullOrWhiteSpace(cleanName))
        {
            throw new ArgumentException("El campo Nombre no puede estar vacío.");
        }

        var cleanCategoryValue = SanitizeText(dto.CategoryValue);
        if (string.IsNullOrWhiteSpace(cleanCategoryValue))
        {
            throw new ArgumentException("El campo Género/Artista no puede estar vacío.");
        }

        var normalized = NormalizeName(cleanName);

        // Validación de unicidad de nombre excluyendo la comunidad actual
        var duplicateExists = await _context.Communities
            .AnyAsync(c => c.NormalizedName == normalized && c.Id != id);

        if (duplicateExists)
        {
            throw new InvalidOperationException($"Ya existe una comunidad con el nombre '{cleanName}'. Por favor elige otro nombre.");
        }

        if (Enum.TryParse<CommunityCategoryType>(dto.CategoryType, true, out var catType))
        {
            community.CategoryType = catType;
        }

        community.Name = cleanName;
        community.NormalizedName = normalized;
        community.CategoryValue = cleanCategoryValue;
        community.Description = SanitizeText(dto.Description);
        if (!string.IsNullOrWhiteSpace(dto.BannerUrl))
        {
            community.BannerUrl = SanitizeUrl(dto.BannerUrl);
        }
        community.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync();

        return MapToDto(community);
    }

    public async Task<bool> DeleteAsync(Guid id, string requestingUserId)
    {
        var community = await _context.Communities.FirstOrDefaultAsync(c => c.Id == id);
        if (community == null) return false;

        ValidateCreatorAccess(community, requestingUserId);

        _context.Communities.Remove(community);
        await _context.SaveChangesAsync();
        return true;
    }

    public async Task<CommunityPlaylistDto> AddPlaylistAsync(Guid communityId, AddCommunityPlaylistDto dto, string requestingUserId)
    {
        var community = await _context.Communities
            .Include(c => c.Playlists)
            .FirstOrDefaultAsync(c => c.Id == communityId);

        if (community == null)
        {
            throw new KeyNotFoundException("La comunidad especificada no existe.");
        }

        // Verificación de autorización de creador
        ValidateCreatorAccess(community, requestingUserId);

        var cleanPlaylistId = dto.PlaylistId.Trim();
        if (string.IsNullOrWhiteSpace(cleanPlaylistId))
        {
            throw new ArgumentException("El identificador de la playlist no puede estar vacío.");
        }

        var cleanTitle = SanitizeText(dto.PlaylistTitle);
        if (string.IsNullOrWhiteSpace(cleanTitle))
        {
            throw new ArgumentException("El título de la playlist no puede estar vacío.");
        }

        // Criterio de Aceptación - Escenario 4: Intento de agregar una playlist ya vinculada
        var alreadyLinked = community.Playlists.Any(p =>
            string.Equals(p.PlaylistId.Trim(), cleanPlaylistId, StringComparison.OrdinalIgnoreCase));

        if (alreadyLinked)
        {
            throw new InvalidOperationException("Esta playlist ya está agregada a la comunidad.");
        }

        // Requisito No Funcional: Confiabilidad y Manejo de Errores con transacción atómica
        var link = new CommunityPlaylist
        {
            Id = Guid.NewGuid(),
            CommunityId = communityId,
            PlaylistId = cleanPlaylistId,
            PlaylistTitle = cleanTitle,
            Description = SanitizeText(dto.Description),
            CoverUrl = SanitizeUrl(dto.CoverUrl),
            SongCount = Math.Max(0, dto.SongCount),
            AddedBy = requestingUserId.Trim(),
            AddedAt = DateTime.UtcNow
        };

        // Si la base de datos soporta transacciones (relacional)
        var executionStrategy = _context.Database.CreateExecutionStrategy();
        await executionStrategy.ExecuteAsync(async () =>
        {
            using var transaction = await _context.Database.BeginTransactionAsync();
            try
            {
                _context.CommunityPlaylists.Add(link);
                community.UpdatedAt = DateTime.UtcNow;
                await _context.SaveChangesAsync();
                await transaction.CommitAsync();
            }
            catch
            {
                await transaction.RollbackAsync();
                throw;
            }
        });

        return MapToPlaylistDto(link);
    }

    public async Task<bool> RemovePlaylistAsync(Guid communityId, string playlistId, string requestingUserId)
    {
        var community = await _context.Communities
            .Include(c => c.Playlists)
            .FirstOrDefaultAsync(c => c.Id == communityId);

        if (community == null) return false;

        ValidateCreatorAccess(community, requestingUserId);

        var item = community.Playlists.FirstOrDefault(p =>
            string.Equals(p.PlaylistId.Trim(), playlistId.Trim(), StringComparison.OrdinalIgnoreCase));

        if (item == null) return false;

        _context.CommunityPlaylists.Remove(item);
        community.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync();
        return true;
    }

    #region Helpers

    private static void ValidateCreatorAccess(Community community, string requestingUserId)
    {
        if (string.IsNullOrWhiteSpace(requestingUserId))
        {
            throw new UnauthorizedAccessException("Debe estar autenticado para modificar esta comunidad.");
        }

        if (!string.Equals(community.CreatorId.Trim(), requestingUserId.Trim(), StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException("Solo el creador de la comunidad tiene permisos para modificarla o gestionar sus contenidos.");
        }
    }

    private static string NormalizeName(string name)
    {
        return Regex.Replace(name.Trim().ToLowerInvariant(), @"\s+", " ");
    }

    private static string SanitizeText(string? input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;
        var stripped = Regex.Replace(input.Trim(), @"<[^>]*>", string.Empty);
        return WebUtility.HtmlEncode(stripped);
    }

    private static string? SanitizeUrl(string? url)
    {
        if (string.IsNullOrWhiteSpace(url)) return null;
        var trimmed = url.Trim();
        if (trimmed.StartsWith("http://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("https://", StringComparison.OrdinalIgnoreCase) ||
            trimmed.StartsWith("data:image/", StringComparison.OrdinalIgnoreCase))
        {
            return trimmed;
        }
        return null;
    }

    private static CommunityDto MapToDto(Community c)
    {
        return new CommunityDto
        {
            Id = c.Id,
            Name = WebUtility.HtmlDecode(c.Name),
            Description = WebUtility.HtmlDecode(c.Description),
            CategoryType = c.CategoryType == CommunityCategoryType.Artist ? "Artist" : "Genre",
            CategoryValue = WebUtility.HtmlDecode(c.CategoryValue),
            CreatorId = c.CreatorId,
            CreatorName = c.CreatorName,
            BannerUrl = c.BannerUrl,
            MemberCount = c.MemberCount,
            CreatedAt = c.CreatedAt,
            UpdatedAt = c.UpdatedAt,
            Playlists = c.Playlists.Select(MapToPlaylistDto).ToList()
        };
    }

    private static CommunityPlaylistDto MapToPlaylistDto(CommunityPlaylist cp)
    {
        return new CommunityPlaylistDto
        {
            Id = cp.Id,
            CommunityId = cp.CommunityId,
            PlaylistId = cp.PlaylistId,
            PlaylistTitle = WebUtility.HtmlDecode(cp.PlaylistTitle),
            Description = string.IsNullOrWhiteSpace(cp.Description) ? null : WebUtility.HtmlDecode(cp.Description),
            CoverUrl = cp.CoverUrl,
            SongCount = cp.SongCount,
            AddedBy = cp.AddedBy,
            AddedAt = cp.AddedAt
        };
    }

    #endregion
}

