using Resonance.Api.Data;
using Resonance.Api.DTOs;
using Resonance.Api.Models;

namespace Resonance.Api.Services;

public class PlaylistService : IPlaylistService
{
    private readonly PlaylistRepository _playlistRepository;

    public PlaylistService(PlaylistRepository playlistRepository)
    {
        _playlistRepository = playlistRepository;
    }

    public async Task<ServiceResult<PlaylistDetailDto>> CreatePlaylistAsync(CreatePlaylistDto dto, CancellationToken ct = default)
    {
        var name = dto.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(name) || name.Length > 120)
            return ServiceResult<PlaylistDetailDto>.BadRequest("El nombre de la playlist es obligatorio y debe tener máximo 120 caracteres.");

        var coverUrl = dto.CoverImageUrl?.Trim() ?? string.Empty;
        if (!string.IsNullOrEmpty(coverUrl) && !Playlist.IsValidCoverUrl(coverUrl))
            return ServiceResult<PlaylistDetailDto>.BadRequest("La URL de portada de la playlist no es válida. Usa una URL http(s), data:image o ruta relativa.");

        var user = await _playlistRepository.FindUserAsync(dto.UserId, ct);
        if (user is null)
            return ServiceResult<PlaylistDetailDto>.NotFound("Usuario propietario no encontrado.");

        var playlist = new Playlist
        {
            Id = Guid.NewGuid(),
            UserId = user.Id,
            AuthorName = string.IsNullOrWhiteSpace(dto.AuthorName) ? user.Name : dto.AuthorName.Trim(),
            Name = name,
            Description = dto.Description?.Trim() ?? string.Empty,
            CoverImageUrl = coverUrl,
            IsPublic = dto.IsPublic,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        await _playlistRepository.AddAsync(playlist, ct);
        var created = await _playlistRepository.GetByIdWithSongsAsync(playlist.Id, track: false, ct);
        return ServiceResult<PlaylistDetailDto>.Created(PlaylistDetailDto.FromEntity(created!));
    }

    public async Task<List<PlaylistDetailDto>> GetUserPlaylistsAsync(Guid userId, CancellationToken ct = default) =>
        (await _playlistRepository.GetByUserIdAsync(userId, ct))
            .Select(PlaylistDetailDto.FromEntity)
            .ToList();

    public async Task<List<PlaylistSummaryDto>> GetPublicPlaylistsAsync(
        Guid? excludeUserId = null, string? search = null, CancellationToken ct = default) =>
        (await _playlistRepository.GetPublicAsync(excludeUserId, search, limit: null, ct))
            .Select(PlaylistSummaryDto.FromEntity)
            .ToList();

    public async Task<ServiceResult<PlaylistDetailDto>> GetPlaylistByIdAsync(Guid playlistId, CancellationToken ct = default)
    {
        var playlist = await _playlistRepository.GetByIdWithSongsAsync(playlistId, track: false, ct);
        return playlist is null
            ? ServiceResult<PlaylistDetailDto>.NotFound("Playlist no encontrada.")
            : ServiceResult<PlaylistDetailDto>.Ok(PlaylistDetailDto.FromEntity(playlist));
    }

    public async Task<ServiceResult<PlaylistDetailDto>> UpdatePlaylistAsync(Guid playlistId, UpdatePlaylistDto dto, CancellationToken ct = default)
    {
        var playlist = await _playlistRepository.GetByIdAsync(playlistId, track: true, ct);
        if (playlist is null)
            return ServiceResult<PlaylistDetailDto>.NotFound("Playlist no encontrada.");

        if (dto.UserId.HasValue && dto.UserId.Value != Guid.Empty && !playlist.IsOwner(dto.UserId.Value))
            return ServiceResult<PlaylistDetailDto>.Forbidden("Solo el propietario puede modificar esta playlist.");

        var nameChanged = false;
        if (dto.Name is not null)
        {
            var trimmedName = dto.Name.Trim();
            if (string.IsNullOrWhiteSpace(trimmedName) || trimmedName.Length > 120)
                return ServiceResult<PlaylistDetailDto>.BadRequest("El nombre de la playlist no puede estar vacío ni superar 120 caracteres.");

            if (!string.Equals(playlist.Name, trimmedName, StringComparison.Ordinal))
            {
                playlist.Name = trimmedName;
                nameChanged = true;
            }
        }

        if (dto.Description is not null)
        {
            var desc = dto.Description.Trim();
            if (desc.Length > 500)
                return ServiceResult<PlaylistDetailDto>.BadRequest("La descripción no puede superar los 500 caracteres.");
            playlist.Description = desc;
        }

        if (dto.CoverImageUrl is not null)
        {
            var cover = dto.CoverImageUrl.Trim();
            if (!string.IsNullOrEmpty(cover) && !Playlist.IsValidCoverUrl(cover))
                return ServiceResult<PlaylistDetailDto>.BadRequest("La URL de portada de la playlist no es válida.");
            playlist.CoverImageUrl = cover;
        }

        if (dto.IsPublic.HasValue) playlist.IsPublic = dto.IsPublic.Value;
        playlist.UpdatedAt = DateTime.UtcNow;

        await _playlistRepository.UpdateWithCommunityTitleSyncAsync(playlist, nameChanged, ct);
        var updated = await _playlistRepository.GetByIdWithSongsAsync(playlistId, track: false, ct);
        return ServiceResult<PlaylistDetailDto>.Ok(PlaylistDetailDto.FromEntity(updated!));
    }

    public async Task<ServiceResult<bool>> DeletePlaylistAsync(Guid playlistId, Guid? requesterId = null, CancellationToken ct = default)
    {
        var playlist = await _playlistRepository.GetByIdAsync(playlistId, track: true, ct);
        if (playlist is null)
            return ServiceResult<bool>.NotFound("Playlist no encontrada.");

        if (requesterId.HasValue && requesterId.Value != Guid.Empty && !playlist.IsOwner(requesterId.Value))
            return ServiceResult<bool>.Forbidden("Solo el propietario puede eliminar esta playlist.");

        await _playlistRepository.RemoveAsync(playlist, ct);
        return ServiceResult<bool>.Ok(true);
    }

    public Task<ServiceResult<PlaylistDetailDto>> AddSongToPlaylistAsync(
        Guid playlistId, Guid songId, Guid? requesterId = null, CancellationToken ct = default) =>
        _playlistRepository.ExecuteInTransactionAsync(async () =>
        {
            var playlist = await _playlistRepository.GetByIdWithSongsAsync(playlistId, track: true, ct);
            if (playlist is null) return ServiceResult<PlaylistDetailDto>.NotFound("Playlist no encontrada.");
            if (requesterId.HasValue && requesterId.Value != Guid.Empty && !playlist.IsOwner(requesterId.Value))
                return ServiceResult<PlaylistDetailDto>.Forbidden("Solo el propietario puede agregar canciones a esta playlist.");

            var song = await _playlistRepository.FindSongAsync(songId, ct);
            if (song is null) return ServiceResult<PlaylistDetailDto>.NotFound("Canción no encontrada.");
            if (playlist.PlaylistSongs.Any(ps => ps.SongId == songId))
                return ServiceResult<PlaylistDetailDto>.Conflict("Esta canción ya está agregada a la playlist.");

            var nextOrder = playlist.PlaylistSongs.Count > 0 ? playlist.PlaylistSongs.Max(ps => ps.OrderIndex) + 1 : 0;
            _playlistRepository.AddPlaylistSong(new PlaylistSong
            {
                Id = Guid.NewGuid(),
                PlaylistId = playlistId,
                SongId = songId,
                OrderIndex = nextOrder,
                AddedAt = DateTime.UtcNow
            });

            if (string.IsNullOrWhiteSpace(playlist.CoverImageUrl) && !string.IsNullOrWhiteSpace(song.CoverImageUrl))
                playlist.CoverImageUrl = song.CoverImageUrl;

            playlist.UpdatedAt = DateTime.UtcNow;
            await _playlistRepository.SaveChangesAsync(ct);

            var updated = await _playlistRepository.GetByIdWithSongsAsync(playlistId, track: false, ct);
            return ServiceResult<PlaylistDetailDto>.Ok(PlaylistDetailDto.FromEntity(updated!));
        }, ct);

    public Task<ServiceResult<PlaylistDetailDto>> RemoveSongFromPlaylistAsync(
        Guid playlistId, Guid songId, Guid? requesterId = null, CancellationToken ct = default) =>
        _playlistRepository.ExecuteInTransactionAsync(async () =>
        {
            var playlist = await _playlistRepository.GetByIdWithSongsAsync(playlistId, track: true, ct);
            if (playlist is null) return ServiceResult<PlaylistDetailDto>.NotFound("Playlist no encontrada.");
            if (requesterId.HasValue && requesterId.Value != Guid.Empty && !playlist.IsOwner(requesterId.Value))
                return ServiceResult<PlaylistDetailDto>.Forbidden("Solo el propietario puede eliminar canciones de esta playlist.");

            var entry = playlist.PlaylistSongs.FirstOrDefault(ps => ps.SongId == songId);
            if (entry is null) return ServiceResult<PlaylistDetailDto>.NotFound("La canción no se encuentra en esta playlist.");

            _playlistRepository.RemovePlaylistSong(entry);
            playlist.PlaylistSongs.Remove(entry);
            playlist.RecalculateSongOrder();
            playlist.UpdatedAt = DateTime.UtcNow;
            await _playlistRepository.SaveChangesAsync(ct);

            var updated = await _playlistRepository.GetByIdWithSongsAsync(playlistId, track: false, ct);
            return ServiceResult<PlaylistDetailDto>.Ok(PlaylistDetailDto.FromEntity(updated!));
        }, ct);

    public Task<ServiceResult<PlaylistDetailDto>> ReorderSongsAsync(
        Guid playlistId, ReorderPlaylistSongsDto dto, CancellationToken ct = default)
    {
        if (dto.SongIds is null || dto.SongIds.Count == 0)
            return Task.FromResult(ServiceResult<PlaylistDetailDto>.BadRequest("Debe proporcionar al menos un identificador de canción para reordenar."));

        return _playlistRepository.ExecuteInTransactionAsync(async () =>
        {
            var playlist = await _playlistRepository.GetByIdWithSongsAsync(playlistId, track: true, ct);
            if (playlist is null) return ServiceResult<PlaylistDetailDto>.NotFound("Playlist no encontrada.");
            if (dto.UserId.HasValue && dto.UserId.Value != Guid.Empty && !playlist.IsOwner(dto.UserId.Value))
                return ServiceResult<PlaylistDetailDto>.Forbidden("Solo el propietario puede reordenar esta playlist.");

            var existingIds = playlist.PlaylistSongs.Select(ps => ps.SongId).ToHashSet();
            foreach (var id in dto.SongIds.Distinct())
            {
                if (!existingIds.Contains(id))
                    return ServiceResult<PlaylistDetailDto>.BadRequest($"La canción {id} no pertenece a esta playlist.");
            }

            playlist.RecalculateSongOrder(dto.SongIds);
            playlist.UpdatedAt = DateTime.UtcNow;
            await _playlistRepository.SaveChangesAsync(ct);

            var updated = await _playlistRepository.GetByIdWithSongsAsync(playlistId, track: false, ct);
            return ServiceResult<PlaylistDetailDto>.Ok(PlaylistDetailDto.FromEntity(updated!));
        }, ct);
    }
}
