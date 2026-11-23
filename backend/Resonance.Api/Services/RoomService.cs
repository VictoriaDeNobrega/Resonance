using System.Security.Cryptography;
using System.Text.RegularExpressions;
using Resonance.Api.Data;
using Resonance.Api.DTOs;
using Resonance.Api.Models;

namespace Resonance.Api.Services;

public class RoomService : IRoomService
{
    private const int HardMaxCapacity = 50;
    private readonly RoomRepository _roomRepository;
    private readonly string _frontendUrl;

    public RoomService(RoomRepository roomRepository, IConfiguration configuration)
    {
        _roomRepository = roomRepository;
        _frontendUrl = (configuration["FrontendUrl"] ?? "http://localhost:5173").TrimEnd('/');
    }

    public async Task<List<RoomSummaryDto>> GetActiveRoomsAsync(string? genre = null, string? search = null, CancellationToken ct = default) =>
        (await _roomRepository.GetActiveRoomsAsync(genre, search, ct)).Select(r => RoomSummaryDto.FromEntity(r, _frontendUrl)).ToList();

    public async Task<ServiceResult<RoomDetailDto>> GetRoomByCodeAsync(string code, bool includeAccessKey = false, CancellationToken ct = default)
    {
        var normalized = Room.NormalizeCode(code);
        var room = await _roomRepository.GetByCodeWithDetailsAsync(normalized, track: false, ct);
        return room is null
            ? ServiceResult<RoomDetailDto>.NotFound($"Sala '{normalized}' no encontrada.")
            : ServiceResult<RoomDetailDto>.Ok(ToDetail(room, includeAccessKey));
    }

    public async Task<ServiceResult<RoomDetailDto>> CreateRoomAsync(CreateRoomDto dto, CancellationToken ct = default)
    {
        var title = dto.Title?.Trim() ?? string.Empty;
        if (title.Length is < 3 or > 50) return ServiceResult<RoomDetailDto>.BadRequest("El título de la sala debe tener entre 3 y 50 caracteres.");
        if (await _roomRepository.TitleExistsAsync(title, ct)) return ServiceResult<RoomDetailDto>.Conflict("Ya existe una sala activa con ese nombre.");
        var capacity = dto.MaxCapacity <= 0 ? HardMaxCapacity : dto.MaxCapacity;
        if (capacity is < 2 or > HardMaxCapacity) return ServiceResult<RoomDetailDto>.BadRequest("La capacidad máxima permitida es de 2 a 50 usuarios simultáneos.");
        var keyResult = ResolveAccessKey(dto.IsPrivate, dto.AccessKey);
        if (!keyResult.Success) return ServiceResult<RoomDetailDto>.BadRequest(keyResult.Error!);
        var host = await _roomRepository.FindUserAsync(dto.HostId, track: true, ct);
        if (host is null) return ServiceResult<RoomDetailDto>.NotFound("Usuario anfitrión no encontrado.");

        var initialSong = dto.InitialSongId is { } sid && sid != Guid.Empty ? await _roomRepository.FindSongAsync(sid, ct) : null;
        var room = new Room
        {
            Id = Guid.NewGuid(), Code = await _roomRepository.GenerateUniqueRoomCodeAsync(ct), Title = title,
            Genre = string.IsNullOrWhiteSpace(dto.Genre) ? "General" : dto.Genre.Trim(),
            IsPrivate = dto.IsPrivate, AccessKey = keyResult.Data, MaxCapacity = capacity,
            HostId = host.Id, HostName = string.IsNullOrWhiteSpace(dto.HostName) ? host.Name : dto.HostName.Trim(),
            IsActive = true, ListenerCount = 1, CreatedAt = DateTime.UtcNow
        };
        room.ApplyTrack(initialSong);
        host.ActiveRoomCode = room.Code;

        return await _roomRepository.ExecuteInTransactionAsync(async () =>
        {
            _roomRepository.AddRoom(room);
            await _roomRepository.SaveChangesAsync(ct);
            return ServiceResult<RoomDetailDto>.Created(ToDetail(room, includeAccessKey: true));
        }, ct);
    }

    public Task<ServiceResult<RoomDetailDto>> JoinRoomAsync(string code, JoinRoomRequestDto dto, CancellationToken ct = default) =>
        WithRoomAsync(code, true, "Esta sala ya fue cerrada por su creador.", async room =>
        {
            var isHost = room.IsHost(dto.UserId);
            if (!isHost && !room.ValidateAccessKey(dto.AccessKey))
                return ServiceResult<RoomDetailDto>.Forbidden("Clave de acceso incorrecta. Se requiere la clave de 6 dígitos de la sala privada.");

            var user = await _roomRepository.FindUserAsync(dto.UserId, track: true, ct);
            if (user is null || !string.Equals(user.ActiveRoomCode, room.Code, StringComparison.OrdinalIgnoreCase))
            {
                if (!room.HasCapacity()) return ServiceResult<RoomDetailDto>.Conflict($"La sala alcanzó su capacidad máxima de {room.MaxCapacity} usuarios simultáneos.");
                room.ListenerCount = Math.Min(room.MaxCapacity, room.ListenerCount + 1);
                if (user is not null) user.ActiveRoomCode = room.Code;
                await _roomRepository.SaveChangesAsync(ct);
            }
            return ServiceResult<RoomDetailDto>.Ok(ToDetail(room, includeAccessKey: isHost));
        }, ct);

    public Task<ServiceResult<RoomSummaryDto>> LeaveRoomAsync(string code, Guid? userId = null, CancellationToken ct = default) =>
        WithRoomAsync(code, false, null, async room =>
        {
            if (room.ListenerCount > 0) room.ListenerCount--;
            if (userId is { } uid && uid != Guid.Empty && await _roomRepository.FindUserAsync(uid, track: true, ct) is { } user &&
                string.Equals(user.ActiveRoomCode, room.Code, StringComparison.OrdinalIgnoreCase))
                user.ActiveRoomCode = null;
            await _roomRepository.SaveChangesAsync(ct);
            return ServiceResult<RoomSummaryDto>.Ok(RoomSummaryDto.FromEntity(room, _frontendUrl));
        }, ct);

    public Task<ServiceResult<RoomDetailDto>> SyncPlaybackStateAsync(string code, SyncPlaybackDto dto, CancellationToken ct = default) =>
        WithRoomAsync(code, true, "La sala está cerrada y no acepta sincronización.", async room =>
        {
            var trackChanged = false;
            if (dto.SongId is { } songId && songId != Guid.Empty && songId != room.CurrentSongId &&
                await _roomRepository.FindSongAsync(songId, ct) is { } catalogSong)
            {
                room.ApplyTrack(catalogSong);
                trackChanged = true;
            }
            room.UpdatePlayback(dto.SongUrl, dto.SongTitle, dto.SongArtist, dto.SongCoverUrl, dto.CurrentTimeMs, dto.IsPlaying, trackChanged);
            await _roomRepository.SaveChangesAsync(ct);
            return ServiceResult<RoomDetailDto>.Ok(ToDetail(room));
        }, ct);

    public async Task<ServiceResult<RoomDetailDto>> AddSongToQueueAsync(string code, AddRoomSongDto dto, CancellationToken ct = default)
    {
        var txResult = await WithRoomAsync(code, true, "La sala está cerrada.", async room =>
        {
            var song = dto.SongId is { } sid && sid != Guid.Empty ? await _roomRepository.FindSongAsync(sid, ct) : null;
            var title = !string.IsNullOrWhiteSpace(dto.Title) ? dto.Title.Trim() : song?.Title ?? string.Empty;
            var artist = !string.IsNullOrWhiteSpace(dto.Artist) ? dto.Artist.Trim() : song?.Artist ?? string.Empty;
            var url = !string.IsNullOrWhiteSpace(dto.Url) ? dto.Url.Trim() : song?.AudioUrl ?? string.Empty;
            var cover = !string.IsNullOrWhiteSpace(dto.CoverUrl) ? dto.CoverUrl.Trim() : song?.CoverImageUrl ?? string.Empty;
            var duration = dto.DurationSeconds > 0 ? dto.DurationSeconds : song?.DurationInSeconds ?? 0;

            if (string.IsNullOrWhiteSpace(title) || string.IsNullOrWhiteSpace(url))
                return ServiceResult<RoomDetailDto>.BadRequest("Debes seleccionar una canción válida del catálogo o indicar título y URL de audio.");

            if (string.IsNullOrWhiteSpace(room.CurrentSongUrl))
                room.ApplyTrack(song?.Id ?? dto.SongId, title, artist, cover, url, isPlaying: true);
            else
                _roomRepository.AddRoomSong(room.CreateQueueEntry(song?.Id ?? dto.SongId, title, artist, url, cover, duration, dto.RequestedBy));

            await _roomRepository.SaveChangesAsync(ct);
            return ServiceResult<RoomDetailDto>.Ok(ToDetail(room));
        }, ct);

        return txResult.Success ? await GetRoomByCodeAsync(code, false, ct) : txResult;
    }

    public Task<ServiceResult<RoomDetailDto>> RemoveSongFromQueueAsync(string code, Guid roomSongId, Guid? requesterId = null, CancellationToken ct = default) =>
        WithRoomAsync(code, false, null, async room =>
        {
            if (requesterId is { } rid && rid != Guid.Empty && !room.IsHost(rid))
                return ServiceResult<RoomDetailDto>.Forbidden("Solo el dueño de la sala puede eliminar canciones de la cola.");
            var item = room.Queue.FirstOrDefault(q => q.Id == roomSongId);
            if (item is null) return ServiceResult<RoomDetailDto>.NotFound("La canción no se encuentra en la cola de la sala.");
            _roomRepository.RemoveRoomSong(item);
            room.Queue.Remove(item);
            await _roomRepository.SaveChangesAsync(ct);
            return ServiceResult<RoomDetailDto>.Ok(ToDetail(room));
        }, ct);

    public Task<ServiceResult<RoomDetailDto>> VoteQueueSongAsync(string code, Guid roomSongId, Guid userId, CancellationToken ct = default) =>
        WithRoomAsync(code, true, "La sala está cerrada.", async room =>
        {
            var item = room.Queue.FirstOrDefault(q => q.Id == roomSongId);
            if (item is null) return ServiceResult<RoomDetailDto>.NotFound("Canción no encontrada en la cola de la sala.");
            item.ToggleVoter(userId);
            await _roomRepository.SaveChangesAsync(ct);
            return ServiceResult<RoomDetailDto>.Ok(ToDetail(room));
        }, ct);

    public Task<ServiceResult<SkipVoteResultDto>> CastSkipVoteAsync(string code, Guid userId, CancellationToken ct = default) =>
        WithRoomAsync(code, true, "La sala está cerrada.", async room =>
        {
            var votes = room.ToggleSkipVoter(userId);
            var required = room.CalculateRequiredSkipVotes();
            var skipped = votes >= required;
            if (skipped)
            {
                if (room.AdvanceToNextTrack() is { } popped) _roomRepository.RemoveRoomSong(popped);
                votes = 0;
            }
            await _roomRepository.SaveChangesAsync(ct);
            return ServiceResult<SkipVoteResultDto>.Ok(new SkipVoteResultDto
            {
                RoomCode = room.Code, CurrentVotes = votes, VotesRequired = required, TrackSkipped = skipped, UpdatedRoom = ToDetail(room)
            });
        }, ct);

    public async Task<ServiceResult<List<RoomMessageDto>>> GetMessagesAsync(string code, int limit = 100, CancellationToken ct = default)
    {
        var normalized = Room.NormalizeCode(code);
        var room = await _roomRepository.GetByCodeAsync(normalized, track: false, ct);
        return room is null
            ? ServiceResult<List<RoomMessageDto>>.NotFound($"Sala '{normalized}' no encontrada.")
            : ServiceResult<List<RoomMessageDto>>.Ok((await _roomRepository.GetMessagesAsync(room.Id, limit, ct)).Select(RoomMessageDto.FromEntity).ToList());
    }

    public async Task<ServiceResult<RoomMessageDto>> SendMessageAsync(string code, SendRoomMessageDto dto, CancellationToken ct = default)
    {
        var content = dto.Content?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(content)) return ServiceResult<RoomMessageDto>.BadRequest("El mensaje de chat no puede estar vacío.");
        if (content.Length > 1000) return ServiceResult<RoomMessageDto>.BadRequest("El mensaje no puede superar los 1000 caracteres.");
        var normalized = Room.NormalizeCode(code);
        var room = await _roomRepository.GetByCodeAsync(normalized, track: false, ct);
        if (room is null) return ServiceResult<RoomMessageDto>.NotFound($"Sala '{normalized}' no encontrada.");
        if (!room.IsActive) return ServiceResult<RoomMessageDto>.BadRequest("No se pueden enviar mensajes a una sala cerrada.");
        var senderName = dto.SenderName?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(senderName) && dto.SenderId.HasValue)
            senderName = (await _roomRepository.FindUserAsync(dto.SenderId.Value, track: false, ct))?.Name ?? "Anónimo";
        var message = new RoomMessage { Id = Guid.NewGuid(), RoomId = room.Id, SenderId = dto.SenderId, SenderName = string.IsNullOrWhiteSpace(senderName) ? "Anónimo" : senderName, Content = content, SentAt = DateTime.UtcNow };
        await _roomRepository.AddMessageAsync(message, ct);
        return ServiceResult<RoomMessageDto>.Created(RoomMessageDto.FromEntity(message));
    }

    public Task<ServiceResult<bool>> CloseRoomAsync(string code, Guid requesterId, bool hardDelete = false, CancellationToken ct = default) =>
        WithRoomAsync(code, false, null, async room =>
        {
            if (!room.IsHost(requesterId)) return ServiceResult<bool>.Forbidden("Solo el creador de la sala puede cerrarla o eliminarla.");
            await _roomRepository.ClearActiveRoomCodeAsync(room.Code, ct);
            if (hardDelete) _roomRepository.RemoveRoom(room); else room.Close();
            await _roomRepository.SaveChangesAsync(ct);
            return ServiceResult<bool>.Ok(true);
        }, ct);

    private RoomDetailDto ToDetail(Room room, bool includeAccessKey = false) => RoomDetailDto.FromEntity(room, _frontendUrl, includeAccessKey);

    private Task<ServiceResult<T>> WithRoomAsync<T>(string code, bool requireActive, string? closedError, Func<Room, Task<ServiceResult<T>>> action, CancellationToken ct) =>
        _roomRepository.ExecuteInTransactionAsync(async () =>
        {
            var normalized = Room.NormalizeCode(code);
            var room = await _roomRepository.GetByCodeWithDetailsAsync(normalized, track: true, ct);
            if (room is null) return ServiceResult<T>.NotFound($"Sala '{normalized}' no encontrada.");
            return requireActive && !room.IsActive ? ServiceResult<T>.BadRequest(closedError ?? "La sala está cerrada.") : await action(room);
        }, ct);

    private static ServiceResult<string?> ResolveAccessKey(bool isPrivate, string? provided)
    {
        if (!isPrivate) return ServiceResult<string?>.Ok(null);
        if (string.IsNullOrWhiteSpace(provided)) return ServiceResult<string?>.Ok(RandomNumberGenerator.GetInt32(0, 1_000_000).ToString("D6"));
        var key = provided.Trim();
        return Regex.IsMatch(key, @"^\d{6}$") ? ServiceResult<string?>.Ok(key) : ServiceResult<string?>.BadRequest("La clave de acceso para sala privada debe tener exactamente 6 dígitos numéricos.");
    }
}
