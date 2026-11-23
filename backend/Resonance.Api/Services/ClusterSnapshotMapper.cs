using System.Diagnostics;
using Microsoft.EntityFrameworkCore;
using Resonance.Api.Data;
using Resonance.Api.DTOs;

namespace Resonance.Api.Services;

internal static class ClusterSnapshotMapper
{
    public static async Task<ClusterDatabaseSnapshotDto> ExportAsync(AppDbContext db, string selfUrl, CancellationToken ct) =>
        new()
        {
            SourceNodeUrl = selfUrl,
            ExportedAtUtc = DateTime.UtcNow,
            Users = await db.Users.AsNoTracking().ToListAsync(ct),
            Songs = await db.Songs.AsNoTracking().ToListAsync(ct),
            UserFavoriteSongs = await db.UserFavoriteSongs.AsNoTracking().ToListAsync(ct),
            Reviews = await db.Reviews.AsNoTracking().ToListAsync(ct),
            Playlists = await db.Playlists.AsNoTracking().ToListAsync(ct),
            PlaylistSongs = await db.PlaylistSongs.AsNoTracking().ToListAsync(ct),
            Communities = await db.Communities.AsNoTracking().ToListAsync(ct),
            CommunityMembers = await db.CommunityMembers.AsNoTracking().ToListAsync(ct),
            CommunityPlaylists = await db.CommunityPlaylists.AsNoTracking().ToListAsync(ct),
            CommunitySongs = await db.CommunitySongs.AsNoTracking().ToListAsync(ct),
            CommunityComments = await db.CommunityComments.AsNoTracking().ToListAsync(ct),
            Rooms = await db.Rooms.AsNoTracking().ToListAsync(ct),
            RoomSongs = await db.RoomSongs.AsNoTracking().ToListAsync(ct),
            RoomMessages = await db.RoomMessages.AsNoTracking().ToListAsync(ct)
        };

    public static async Task<(ClusterSyncResultDto Result, string SummaryMessage)> ImportAsync(
        AppDbContext db, ClusterDatabaseSnapshotDto snapshot, string nodeRole, CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();
        int usersMerged = 0, songsMerged = 0, playlistsMerged = 0, communitiesMerged = 0, roomsMerged = 0;
        await using var tx = await db.Database.BeginTransactionAsync(ct);

        var localUsers = await db.Users.AsNoTracking().Select(x => new { x.Id, x.Email }).ToListAsync(ct);
        var userIds = localUsers.Select(x => x.Id).ToHashSet();
        var userByEmail = localUsers.ToDictionary(x => x.Email, x => x.Id, StringComparer.OrdinalIgnoreCase);
        var userMap = new Dictionary<Guid, Guid>();
        foreach (var u in snapshot.Users)
        {
            if (userIds.Contains(u.Id)) { userMap[u.Id] = u.Id; continue; }
            if (userByEmail.TryGetValue(u.Email, out var existingUid)) { userMap[u.Id] = existingUid; continue; }
            u.LastPlayedSongId = null; u.ActiveRoomCode = null;
            db.Users.Add(u); userIds.Add(u.Id); userByEmail[u.Email] = u.Id; userMap[u.Id] = u.Id; usersMerged++;
        }
        await db.SaveChangesAsync(ct);
        Guid MapUser(Guid id) => userMap.TryGetValue(id, out var mapped) ? mapped : id;

        var localSongs = await db.Songs.AsNoTracking().Select(x => new { x.Id, x.ExternalId, x.SourceServer }).ToListAsync(ct);
        var songIds = localSongs.Select(x => x.Id).ToHashSet();
        var songByKey = localSongs.Where(x => x.ExternalId != null)
            .GroupBy(x => (x.ExternalId!, x.SourceServer))
            .ToDictionary(g => g.Key, g => g.First().Id);
        var songMap = new Dictionary<Guid, Guid>();

        foreach (var s in snapshot.Songs)
        {
            if (songIds.Contains(s.Id)) { songMap[s.Id] = s.Id; continue; }
            if (s.ExternalId != null && songByKey.TryGetValue((s.ExternalId, s.SourceServer), out var existingSid))
            {
                songMap[s.Id] = existingSid;
                continue;
            }
            if (s.UploadedById.HasValue)
            {
                var mappedUploader = MapUser(s.UploadedById.Value);
                s.UploadedById = userIds.Contains(mappedUploader) ? mappedUploader : null;
            }
            db.Songs.Add(s);
            songIds.Add(s.Id);
            if (s.ExternalId != null) songByKey[(s.ExternalId, s.SourceServer)] = s.Id;
            songMap[s.Id] = s.Id;
            songsMerged++;
        }
        await db.SaveChangesAsync(ct);
        Guid MapSong(Guid id) => songMap.TryGetValue(id, out var mapped) ? mapped : id;

        var favSet = (await db.UserFavoriteSongs.Select(x => new { x.UserId, x.SongId }).ToListAsync(ct))
            .Select(x => (x.UserId, x.SongId)).ToHashSet();
        foreach (var f in snapshot.UserFavoriteSongs)
        {
            f.UserId = MapUser(f.UserId);
            f.SongId = MapSong(f.SongId);
            if (userIds.Contains(f.UserId) && songIds.Contains(f.SongId) && favSet.Add((f.UserId, f.SongId)))
                db.UserFavoriteSongs.Add(f);
        }

        var revIds = (await db.Reviews.Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        foreach (var rv in snapshot.Reviews)
        {
            rv.UserId = MapUser(rv.UserId);
            rv.SongId = MapSong(rv.SongId);
            if (!revIds.Contains(rv.Id) && userIds.Contains(rv.UserId) && songIds.Contains(rv.SongId) && revIds.Add(rv.Id))
                db.Reviews.Add(rv);
        }

        var plIds = (await db.Playlists.Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        foreach (var p in snapshot.Playlists)
        {
            p.UserId = MapUser(p.UserId);
            if (!plIds.Contains(p.Id) && userIds.Contains(p.UserId) && plIds.Add(p.Id))
            {
                db.Playlists.Add(p);
                playlistsMerged++;
            }
        }
        await db.SaveChangesAsync(ct);

        var psSet = (await db.PlaylistSongs.Select(x => new { x.PlaylistId, x.SongId }).ToListAsync(ct))
            .Select(x => (x.PlaylistId, x.SongId)).ToHashSet();
        foreach (var ps in snapshot.PlaylistSongs)
        {
            ps.SongId = MapSong(ps.SongId);
            if (plIds.Contains(ps.PlaylistId) && songIds.Contains(ps.SongId) && psSet.Add((ps.PlaylistId, ps.SongId)))
                db.PlaylistSongs.Add(ps);
        }

        var localComms = await db.Communities.AsNoTracking().Select(x => new { x.Id, x.NormalizedName }).ToListAsync(ct);
        var commIds = localComms.Select(x => x.Id).ToHashSet();
        var commByName = localComms.ToDictionary(x => x.NormalizedName, x => x.Id, StringComparer.OrdinalIgnoreCase);
        var commMap = new Dictionary<Guid, Guid>();

        foreach (var c in snapshot.Communities)
        {
            c.CreatorId = MapUser(c.CreatorId);
            if (commIds.Contains(c.Id)) { commMap[c.Id] = c.Id; continue; }
            if (commByName.TryGetValue(c.NormalizedName, out var existingCid)) { commMap[c.Id] = existingCid; continue; }
            if (userIds.Contains(c.CreatorId))
            {
                db.Communities.Add(c);
                commIds.Add(c.Id);
                commByName[c.NormalizedName] = c.Id;
                commMap[c.Id] = c.Id;
                communitiesMerged++;
            }
        }
        await db.SaveChangesAsync(ct);
        Guid MapComm(Guid id) => commMap.TryGetValue(id, out var mapped) ? mapped : id;

        var cmSet = (await db.CommunityMembers.Select(x => new { x.CommunityId, x.UserId }).ToListAsync(ct))
            .Select(x => (x.CommunityId, x.UserId)).ToHashSet();
        foreach (var cm in snapshot.CommunityMembers)
        {
            cm.CommunityId = MapComm(cm.CommunityId);
            cm.UserId = MapUser(cm.UserId);
            if (commIds.Contains(cm.CommunityId) && userIds.Contains(cm.UserId) && cmSet.Add((cm.CommunityId, cm.UserId)))
                db.CommunityMembers.Add(cm);
        }

        var cpSet = (await db.CommunityPlaylists.Select(x => new { x.CommunityId, x.PlaylistId }).ToListAsync(ct))
            .Select(x => (x.CommunityId, x.PlaylistId)).ToHashSet();
        foreach (var cp in snapshot.CommunityPlaylists)
        {
            cp.CommunityId = MapComm(cp.CommunityId);
            cp.AddedByUserId = MapUser(cp.AddedByUserId);
            if (commIds.Contains(cp.CommunityId) && plIds.Contains(cp.PlaylistId) && cpSet.Add((cp.CommunityId, cp.PlaylistId)))
                db.CommunityPlaylists.Add(cp);
        }

        var csSet = (await db.CommunitySongs.Select(x => new { x.CommunityId, x.SongId }).ToListAsync(ct))
            .Select(x => (x.CommunityId, x.SongId)).ToHashSet();
        foreach (var cs in snapshot.CommunitySongs)
        {
            cs.CommunityId = MapComm(cs.CommunityId);
            cs.SongId = MapSong(cs.SongId);
            cs.AddedByUserId = MapUser(cs.AddedByUserId);
            if (commIds.Contains(cs.CommunityId) && songIds.Contains(cs.SongId) && csSet.Add((cs.CommunityId, cs.SongId)))
                db.CommunitySongs.Add(cs);
        }

        var ccIds = (await db.CommunityComments.Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        foreach (var cc in snapshot.CommunityComments)
        {
            cc.CommunityId = MapComm(cc.CommunityId);
            cc.AuthorId = MapUser(cc.AuthorId);
            if (!ccIds.Contains(cc.Id) && commIds.Contains(cc.CommunityId) && userIds.Contains(cc.AuthorId) && ccIds.Add(cc.Id))
                db.CommunityComments.Add(cc);
        }

        var localRooms = await db.Rooms.AsNoTracking().Select(x => new { x.Id, x.Code }).ToListAsync(ct);
        var roomIds = localRooms.Select(x => x.Id).ToHashSet();
        var roomByCode = localRooms.ToDictionary(x => x.Code, x => x.Id, StringComparer.OrdinalIgnoreCase);
        var roomMap = new Dictionary<Guid, Guid>();

        foreach (var r in snapshot.Rooms)
        {
            r.HostId = MapUser(r.HostId);
            if (r.CurrentSongId.HasValue)
            {
                var mappedSong = MapSong(r.CurrentSongId.Value);
                r.CurrentSongId = songIds.Contains(mappedSong) ? mappedSong : null;
            }
            if (roomIds.Contains(r.Id)) { roomMap[r.Id] = r.Id; continue; }
            if (roomByCode.TryGetValue(r.Code, out var existingRid)) { roomMap[r.Id] = existingRid; continue; }
            if (userIds.Contains(r.HostId))
            {
                db.Rooms.Add(r);
                roomIds.Add(r.Id);
                roomByCode[r.Code] = r.Id;
                roomMap[r.Id] = r.Id;
                roomsMerged++;
            }
        }
        await db.SaveChangesAsync(ct);
        Guid MapRoom(Guid id) => roomMap.TryGetValue(id, out var mapped) ? mapped : id;

        var rsIds = (await db.RoomSongs.Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        foreach (var rs in snapshot.RoomSongs)
        {
            rs.RoomId = MapRoom(rs.RoomId);
            if (rs.SongId.HasValue) rs.SongId = MapSong(rs.SongId.Value);
            if (!rsIds.Contains(rs.Id) && roomIds.Contains(rs.RoomId) && rsIds.Add(rs.Id))
                db.RoomSongs.Add(rs);
        }

        var rmIds = (await db.RoomMessages.Select(x => x.Id).ToListAsync(ct)).ToHashSet();
        foreach (var rm in snapshot.RoomMessages)
        {
            rm.RoomId = MapRoom(rm.RoomId);
            if (rm.SenderId.HasValue) rm.SenderId = MapUser(rm.SenderId.Value);
            if (!rmIds.Contains(rm.Id) && roomIds.Contains(rm.RoomId) && rmIds.Add(rm.Id))
                db.RoomMessages.Add(rm);
        }

        await db.SaveChangesAsync(ct);
        await tx.CommitAsync(ct);
        sw.Stop();

        var msg = $"Sincronizado desde {snapshot.SourceNodeUrl}: +{usersMerged} usuarios, +{songsMerged} canciones, +{playlistsMerged} playlists, +{communitiesMerged} comunidades, +{roomsMerged} salas.";
        return (new ClusterSyncResultDto
        {
            Success = true, NodeRole = nodeRole, PeerUrl = snapshot.SourceNodeUrl,
            UsersMerged = usersMerged, SongsMerged = songsMerged, PlaylistsMerged = playlistsMerged,
            CommunitiesMerged = communitiesMerged, RoomsMerged = roomsMerged,
            ElapsedMs = sw.ElapsedMilliseconds, Message = msg
        }, msg);
    }
}
