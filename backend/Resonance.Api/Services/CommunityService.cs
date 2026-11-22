using Resonance.Api.Data;
using Resonance.Api.DTOs;
using Resonance.Api.Models;

namespace Resonance.Api.Services;

public class CommunityService : ICommunityService
{
    private readonly CommunityRepository _communityRepository;

    public CommunityService(CommunityRepository communityRepository)
    {
        _communityRepository = communityRepository;
    }

    public async Task<List<CommunityDto>> GetCommunitiesAsync(
        string? search = null, CommunityCategoryType? categoryType = null, string? categoryValue = null, Guid? userId = null, CancellationToken ct = default) =>
        (await _communityRepository.GetFilteredAsync(search, categoryType, categoryValue, limit: null, orderByMembersDesc: true, ct))
            .Select(c => CommunityDto.FromEntity(c, userId))
            .ToList();

    public async Task<ServiceResult<CommunityDetailDto>> GetCommunityByIdAsync(Guid communityId, Guid? userId = null, CancellationToken ct = default)
    {
        var community = await _communityRepository.GetByIdWithDetailsAsync(communityId, ct);
        return community is null
            ? ServiceResult<CommunityDetailDto>.NotFound("Comunidad no encontrada.")
            : ServiceResult<CommunityDetailDto>.Ok(CommunityDetailDto.FromEntity(community, userId));
    }

    public async Task<ServiceResult<CommunityDetailDto>> CreateCommunityAsync(CreateCommunityDto dto, CancellationToken ct = default)
    {
        var name = dto.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(name)) return ServiceResult<CommunityDetailDto>.BadRequest("El campo Nombre no puede estar vacío.");
        var categoryValue = dto.CategoryValue?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(categoryValue)) return ServiceResult<CommunityDetailDto>.BadRequest("El campo Género no puede estar vacío.");

        var normalizedName = Community.Normalize(name);
        if (await _communityRepository.NormalizedNameExistsAsync(normalizedName, excludeCommunityId: null, ct))
            return ServiceResult<CommunityDetailDto>.Conflict("Ya existe una comunidad con ese nombre.");

        var creator = await _communityRepository.FindUserAsync(dto.CreatorId, ct);
        if (creator is null) return ServiceResult<CommunityDetailDto>.NotFound("Usuario creador no encontrado.");

        var creatorName = string.IsNullOrWhiteSpace(dto.CreatorName) ? creator.Name : dto.CreatorName.Trim();
        var now = DateTime.UtcNow;

        var community = new Community
        {
            Id = Guid.NewGuid(), Name = name, NormalizedName = normalizedName,
            Description = dto.Description?.Trim() ?? string.Empty,
            CategoryType = dto.CategoryType, CategoryValue = categoryValue,
            CoverImageUrl = dto.CoverImageUrl?.Trim() ?? string.Empty,
            CreatorId = creator.Id, CreatorName = creatorName, CreatedAt = now, UpdatedAt = now
        };
        var founder = new CommunityMember { Id = Guid.NewGuid(), CommunityId = community.Id, UserId = creator.Id, UserName = creatorName, JoinedAt = now };

        await _communityRepository.CreateWithFounderAsync(community, founder, ct);
        var detail = await _communityRepository.GetByIdWithDetailsAsync(community.Id, ct);
        return ServiceResult<CommunityDetailDto>.Created(CommunityDetailDto.FromEntity(detail!, creator.Id));
    }

    public async Task<ServiceResult<CommunityDetailDto>> UpdateCommunityAsync(Guid communityId, UpdateCommunityDto dto, CancellationToken ct = default)
    {
        var name = dto.Name?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(name)) return ServiceResult<CommunityDetailDto>.BadRequest("El campo Nombre no puede estar vacío.");
        var categoryValue = dto.CategoryValue?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(categoryValue)) return ServiceResult<CommunityDetailDto>.BadRequest("El campo Género no puede estar vacío.");

        var community = await _communityRepository.GetByIdAsync(communityId, track: true, ct);
        if (community is null) return ServiceResult<CommunityDetailDto>.NotFound("Comunidad no encontrada.");
        if (dto.UserId is { } uid && uid != Guid.Empty && !community.IsOwner(uid))
            return ServiceResult<CommunityDetailDto>.Forbidden("Solo el dueño de la comunidad puede editar sus datos.");

        var normalizedName = Community.Normalize(name);
        if (await _communityRepository.NormalizedNameExistsAsync(normalizedName, excludeCommunityId: communityId, ct))
            return ServiceResult<CommunityDetailDto>.Conflict("Ya existe otra comunidad con ese nombre.");

        community.Name = name;
        community.NormalizedName = normalizedName;
        community.Description = dto.Description?.Trim() ?? string.Empty;
        community.CategoryType = dto.CategoryType;
        community.CategoryValue = categoryValue;
        if (dto.CoverImageUrl is not null) community.CoverImageUrl = dto.CoverImageUrl.Trim();
        community.UpdatedAt = DateTime.UtcNow;

        await _communityRepository.SaveChangesAsync(ct);
        var detail = await _communityRepository.GetByIdWithDetailsAsync(communityId, ct);
        return ServiceResult<CommunityDetailDto>.Ok(CommunityDetailDto.FromEntity(detail!, dto.UserId ?? community.CreatorId));
    }

    public Task<ServiceResult<bool>> DeleteCommunityAsync(Guid communityId, Guid requesterId, CancellationToken ct = default) =>
        WithOwnedCommunityAsync(communityId, requesterId, "Solo el dueño de la comunidad puede eliminarla.", async community =>
        {
            await _communityRepository.RemoveAsync(community, ct);
            return ServiceResult<bool>.Ok(true);
        }, ct);

    public async Task<ServiceResult<CommunityDetailDto>> JoinCommunityAsync(Guid communityId, JoinCommunityRequestDto dto, CancellationToken ct = default)
    {
        if (!await _communityRepository.ExistsAsync(communityId, ct)) return ServiceResult<CommunityDetailDto>.NotFound("Comunidad no encontrada.");
        var user = await _communityRepository.FindUserAsync(dto.UserId, ct);
        if (user is null) return ServiceResult<CommunityDetailDto>.NotFound("Usuario no encontrado.");
        if (await _communityRepository.IsMemberAsync(communityId, dto.UserId, ct))
            return ServiceResult<CommunityDetailDto>.Conflict("El usuario ya es miembro de esta comunidad.");

        await _communityRepository.AddMemberAsync(new CommunityMember
        {
            Id = Guid.NewGuid(), CommunityId = communityId, UserId = user.Id,
            UserName = string.IsNullOrWhiteSpace(dto.UserName) ? user.Name : dto.UserName.Trim(),
            JoinedAt = DateTime.UtcNow
        }, ct);

        var detail = await _communityRepository.GetByIdWithDetailsAsync(communityId, ct);
        return ServiceResult<CommunityDetailDto>.Ok(CommunityDetailDto.FromEntity(detail!, user.Id));
    }

    public async Task<ServiceResult<CommunityDetailDto>> LeaveCommunityAsync(Guid communityId, Guid userId, CancellationToken ct = default)
    {
        var community = await _communityRepository.GetByIdAsync(communityId, track: false, ct);
        if (community is null) return ServiceResult<CommunityDetailDto>.NotFound("Comunidad no encontrada.");
        if (community.IsOwner(userId))
            return ServiceResult<CommunityDetailDto>.BadRequest("El dueño de la comunidad no puede abandonarla; debe eliminarla si desea cerrarla.");

        var membership = await _communityRepository.GetMemberAsync(communityId, userId, ct);
        if (membership is null) return ServiceResult<CommunityDetailDto>.NotFound("El usuario no es miembro de esta comunidad.");

        await _communityRepository.RemoveMemberAsync(membership, ct);
        var detail = await _communityRepository.GetByIdWithDetailsAsync(communityId, ct);
        return ServiceResult<CommunityDetailDto>.Ok(CommunityDetailDto.FromEntity(detail!, userId));
    }

    public Task<ServiceResult<CommunityPlaylistDto>> AddPlaylistToCommunityAsync(Guid communityId, AddCommunityPlaylistDto dto, CancellationToken ct = default) =>
        WithOwnedCommunityAsync(communityId, dto.AddedByUserId, "Solo el dueño de la comunidad puede agregar playlists.", async community =>
        {
            var playlist = await _communityRepository.FindPlaylistWithSongsAsync(dto.PlaylistId, ct);
            if (playlist is null) return ServiceResult<CommunityPlaylistDto>.NotFound("Playlist no encontrada.");
            if (await _communityRepository.IsPlaylistLinkedAsync(communityId, dto.PlaylistId, ct))
                return ServiceResult<CommunityPlaylistDto>.Conflict("Esta playlist ya está agregada a la comunidad.");

            var link = new CommunityPlaylist { Id = Guid.NewGuid(), CommunityId = communityId, PlaylistId = playlist.Id, PlaylistTitle = playlist.Name, AddedByUserId = dto.AddedByUserId, AddedAt = DateTime.UtcNow };
            await _communityRepository.AddCommunityPlaylistAsync(link, community, ct);
            return ServiceResult<CommunityPlaylistDto>.Created(CommunityPlaylistDto.FromEntity(link, playlist));
        }, ct);

    public Task<ServiceResult<bool>> RemovePlaylistFromCommunityAsync(Guid communityId, Guid playlistId, Guid requesterId, CancellationToken ct = default) =>
        WithOwnedCommunityAsync(communityId, requesterId, "Solo el dueño de la comunidad puede eliminar contenido multimedia.", async community =>
        {
            var link = await _communityRepository.GetCommunityPlaylistAsync(communityId, playlistId, ct);
            if (link is null) return ServiceResult<bool>.NotFound("La playlist no está vinculada a esta comunidad.");
            await _communityRepository.RemoveCommunityPlaylistAsync(link, community, ct);
            return ServiceResult<bool>.Ok(true);
        }, ct);

    public Task<ServiceResult<CommunitySongDto>> AddSongToCommunityAsync(Guid communityId, AddCommunitySongDto dto, CancellationToken ct = default) =>
        WithOwnedCommunityAsync(communityId, dto.AddedByUserId, "Solo el dueño de la comunidad puede agregar canciones individuales.", async community =>
        {
            var song = await _communityRepository.FindSongAsync(dto.SongId, ct);
            if (song is null) return ServiceResult<CommunitySongDto>.NotFound("Canción no encontrada.");
            if (await _communityRepository.IsSongLinkedAsync(communityId, dto.SongId, ct))
                return ServiceResult<CommunitySongDto>.Conflict("Esta canción ya está agregada a la comunidad.");

            var link = new CommunitySong { Id = Guid.NewGuid(), CommunityId = communityId, SongId = song.Id, AddedByUserId = dto.AddedByUserId, AddedAt = DateTime.UtcNow };
            await _communityRepository.AddCommunitySongAsync(link, community, ct);
            return ServiceResult<CommunitySongDto>.Created(CommunitySongDto.FromEntity(link, song));
        }, ct);

    public Task<ServiceResult<bool>> RemoveSongFromCommunityAsync(Guid communityId, Guid songId, Guid requesterId, CancellationToken ct = default) =>
        WithOwnedCommunityAsync(communityId, requesterId, "Solo el dueño de la comunidad puede eliminar canciones de la comunidad.", async community =>
        {
            var link = await _communityRepository.GetCommunitySongAsync(communityId, songId, ct);
            if (link is null) return ServiceResult<bool>.NotFound("La canción no se encuentra en esta comunidad.");
            await _communityRepository.RemoveCommunitySongAsync(link, community, ct);
            return ServiceResult<bool>.Ok(true);
        }, ct);

    public async Task<ServiceResult<List<CommunityCommentDto>>> GetCommentsAsync(Guid communityId, CancellationToken ct = default)
    {
        var community = await _communityRepository.GetByIdAsync(communityId, track: false, ct);
        if (community is null) return ServiceResult<List<CommunityCommentDto>>.NotFound("Comunidad no encontrada.");
        var comments = await _communityRepository.GetCommentsAsync(communityId, ct);
        return ServiceResult<List<CommunityCommentDto>>.Ok(comments.Select(cc => CommunityCommentDto.FromEntity(cc, community.CreatorId)).ToList());
    }

    public async Task<ServiceResult<CommunityCommentDto>> AddCommentAsync(Guid communityId, CreateCommunityCommentDto dto, CancellationToken ct = default)
    {
        var content = dto.Content?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(content)) return ServiceResult<CommunityCommentDto>.BadRequest("El comentario no puede estar vacío.");
        if (content.Length > 1000) return ServiceResult<CommunityCommentDto>.BadRequest("El comentario no puede superar los 1000 caracteres.");

        var community = await _communityRepository.GetByIdAsync(communityId, track: false, ct);
        if (community is null) return ServiceResult<CommunityCommentDto>.NotFound("Comunidad no encontrada.");

        var author = await _communityRepository.FindUserAsync(dto.AuthorId, ct);
        if (author is null) return ServiceResult<CommunityCommentDto>.NotFound("Usuario autor no encontrado.");

        var comment = new CommunityComment
        {
            Id = Guid.NewGuid(), CommunityId = communityId, AuthorId = author.Id,
            AuthorName = string.IsNullOrWhiteSpace(dto.AuthorName) ? author.Name : dto.AuthorName.Trim(),
            Content = content, CreatedAt = DateTime.UtcNow
        };
        await _communityRepository.AddCommentAsync(comment, ct);
        return ServiceResult<CommunityCommentDto>.Created(CommunityCommentDto.FromEntity(comment, community.CreatorId));
    }

    public async Task<ServiceResult<bool>> DeleteCommentAsync(Guid communityId, Guid commentId, Guid requesterId, CancellationToken ct = default)
    {
        var community = await _communityRepository.GetByIdAsync(communityId, track: false, ct);
        if (community is null) return ServiceResult<bool>.NotFound("Comunidad no encontrada.");

        var comment = await _communityRepository.GetCommentAsync(communityId, commentId, ct);
        if (comment is null) return ServiceResult<bool>.NotFound("Comentario no encontrado.");
        if (!community.CanModerateComment(comment, requesterId))
            return ServiceResult<bool>.Forbidden("Solo el dueño de la comunidad o el autor puede eliminar este comentario.");

        await _communityRepository.RemoveCommentAsync(comment, ct);
        return ServiceResult<bool>.Ok(true);
    }

    private async Task<ServiceResult<T>> WithOwnedCommunityAsync<T>(
        Guid communityId, Guid requesterId, string forbiddenError, Func<Community, Task<ServiceResult<T>>> action, CancellationToken ct)
    {
        var community = await _communityRepository.GetByIdAsync(communityId, track: true, ct);
        if (community is null) return ServiceResult<T>.NotFound("Comunidad no encontrada.");
        return !community.IsOwner(requesterId) ? ServiceResult<T>.Forbidden(forbiddenError) : await action(community);
    }
}
