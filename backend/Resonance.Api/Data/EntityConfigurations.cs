using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using Resonance.Api.Models;

namespace Resonance.Api.Data;

public class UserConfiguration : IEntityTypeConfiguration<User>
{
    public void Configure(EntityTypeBuilder<User> entity)
    {
        entity.ToTable("Users");
        entity.HasKey(u => u.Id);
        entity.Property(u => u.Name).IsRequired().HasMaxLength(120);
        entity.Property(u => u.Email).IsRequired().HasMaxLength(200);
        entity.Property(u => u.PasswordHash).IsRequired().HasMaxLength(512);
        entity.Property(u => u.AvatarUrl).HasMaxLength(1000).HasDefaultValue(string.Empty);
        entity.Property(u => u.Bio).HasMaxLength(500).HasDefaultValue(string.Empty);
        entity.Property(u => u.ConfirmationToken).HasMaxLength(128);
        entity.Property(u => u.PreferredVolume).HasDefaultValue(0.8);
        entity.Property(u => u.ActiveView).IsRequired().HasMaxLength(60).HasDefaultValue("discover");
        entity.Property(u => u.ActiveRoomCode).HasMaxLength(32);
        entity.HasIndex(u => u.Email).IsUnique();
        entity.HasIndex(u => u.Name);
        entity.HasOne(u => u.LastPlayedSong).WithMany().HasForeignKey(u => u.LastPlayedSongId).OnDelete(DeleteBehavior.SetNull);
    }
}

public class SongConfiguration : IEntityTypeConfiguration<Song>
{
    public void Configure(EntityTypeBuilder<Song> entity)
    {
        entity.ToTable("Songs");
        entity.HasKey(s => s.Id);
        entity.Property(s => s.ExternalId).HasMaxLength(128);
        entity.Property(s => s.SourceServer).IsRequired().HasMaxLength(32).HasDefaultValue("local");
        entity.Property(s => s.Title).IsRequired().HasMaxLength(200);
        entity.Property(s => s.Artist).IsRequired().HasMaxLength(200);
        entity.Property(s => s.Album).HasMaxLength(200).HasDefaultValue(string.Empty);
        entity.Property(s => s.Genre).IsRequired().HasMaxLength(100);
        entity.Property(s => s.AudioUrl).IsRequired().HasMaxLength(1000);
        entity.Property(s => s.CoverImageUrl).HasMaxLength(1000).HasDefaultValue(string.Empty);
        entity.Property(s => s.Description).HasMaxLength(1000).HasDefaultValue(string.Empty);
        entity.Property(s => s.UploadedByName).HasMaxLength(120).HasDefaultValue("Resonance");
        entity.HasIndex(s => new { s.ExternalId, s.SourceServer }).IsUnique().HasFilter("\"ExternalId\" IS NOT NULL");
        entity.HasIndex(s => s.SourceServer);
        entity.HasIndex(s => s.Title);
        entity.HasIndex(s => s.Artist);
        entity.HasIndex(s => s.Genre);
        entity.HasOne(s => s.UploadedBy).WithMany(u => u.UploadedSongs).HasForeignKey(s => s.UploadedById).OnDelete(DeleteBehavior.SetNull);
    }
}

public class UserFavoriteSongConfiguration : IEntityTypeConfiguration<UserFavoriteSong>
{
    public void Configure(EntityTypeBuilder<UserFavoriteSong> entity)
    {
        entity.ToTable("UserFavoriteSongs");
        entity.HasKey(f => f.Id);
        entity.HasIndex(f => new { f.UserId, f.SongId }).IsUnique();
        entity.HasOne(f => f.User).WithMany(u => u.FavoriteSongs).HasForeignKey(f => f.UserId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne(f => f.Song).WithMany(s => s.FavoritedByUsers).HasForeignKey(f => f.SongId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class ReviewConfiguration : IEntityTypeConfiguration<Review>
{
    public void Configure(EntityTypeBuilder<Review> entity)
    {
        entity.ToTable("Reviews");
        entity.HasKey(r => r.Id);
        entity.Property(r => r.UserName).IsRequired().HasMaxLength(120);
        entity.Property(r => r.Content).IsRequired().HasMaxLength(1000);
        entity.HasIndex(r => new { r.SongId, r.CreatedAt });
        entity.HasOne(r => r.Song).WithMany(s => s.Reviews).HasForeignKey(r => r.SongId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne(r => r.User).WithMany(u => u.Reviews).HasForeignKey(r => r.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class PlaylistConfiguration : IEntityTypeConfiguration<Playlist>
{
    public void Configure(EntityTypeBuilder<Playlist> entity)
    {
        entity.ToTable("Playlists");
        entity.HasKey(p => p.Id);
        entity.Property(p => p.AuthorName).IsRequired().HasMaxLength(120);
        entity.Property(p => p.Name).IsRequired().HasMaxLength(120);
        entity.Property(p => p.Description).HasMaxLength(500).HasDefaultValue(string.Empty);
        entity.Property(p => p.CoverImageUrl).HasMaxLength(1000).HasDefaultValue(string.Empty);
        entity.Property(p => p.IsPublic).HasDefaultValue(true);
        entity.HasIndex(p => p.Name);
        entity.HasIndex(p => new { p.IsPublic, p.UpdatedAt });
        entity.HasOne(p => p.User).WithMany(u => u.Playlists).HasForeignKey(p => p.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class PlaylistSongConfiguration : IEntityTypeConfiguration<PlaylistSong>
{
    public void Configure(EntityTypeBuilder<PlaylistSong> entity)
    {
        entity.ToTable("PlaylistSongs");
        entity.HasKey(ps => ps.Id);
        entity.HasIndex(ps => new { ps.PlaylistId, ps.SongId }).IsUnique();
        entity.HasIndex(ps => new { ps.PlaylistId, ps.OrderIndex });
        entity.HasOne(ps => ps.Playlist).WithMany(p => p.PlaylistSongs).HasForeignKey(ps => ps.PlaylistId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne(ps => ps.Song).WithMany(s => s.PlaylistSongs).HasForeignKey(ps => ps.SongId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class CommunityConfiguration : IEntityTypeConfiguration<Community>
{
    public void Configure(EntityTypeBuilder<Community> entity)
    {
        entity.ToTable("Communities");
        entity.HasKey(c => c.Id);
        entity.Property(c => c.Name).IsRequired().HasMaxLength(120);
        entity.Property(c => c.NormalizedName).IsRequired().HasMaxLength(120);
        entity.Property(c => c.Description).HasMaxLength(600).HasDefaultValue(string.Empty);
        entity.Property(c => c.CategoryType).HasConversion<int>();
        entity.Property(c => c.CategoryValue).IsRequired().HasMaxLength(120);
        entity.Property(c => c.CoverImageUrl).HasMaxLength(1000).HasDefaultValue(string.Empty);
        entity.Property(c => c.CreatorName).IsRequired().HasMaxLength(120);
        entity.HasIndex(c => c.NormalizedName).IsUnique();
        entity.HasIndex(c => c.Name);
        entity.HasOne(c => c.Creator).WithMany(u => u.CreatedCommunities).HasForeignKey(c => c.CreatorId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class CommunityMemberConfiguration : IEntityTypeConfiguration<CommunityMember>
{
    public void Configure(EntityTypeBuilder<CommunityMember> entity)
    {
        entity.ToTable("CommunityMembers");
        entity.HasKey(m => m.Id);
        entity.Property(m => m.UserName).IsRequired().HasMaxLength(120);
        entity.HasIndex(m => new { m.CommunityId, m.UserId }).IsUnique();
        entity.HasOne(m => m.Community).WithMany(c => c.Members).HasForeignKey(m => m.CommunityId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne(m => m.User).WithMany(u => u.CommunityMemberships).HasForeignKey(m => m.UserId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class CommunityPlaylistConfiguration : IEntityTypeConfiguration<CommunityPlaylist>
{
    public void Configure(EntityTypeBuilder<CommunityPlaylist> entity)
    {
        entity.ToTable("CommunityPlaylists");
        entity.HasKey(cp => cp.Id);
        entity.Property(cp => cp.PlaylistTitle).IsRequired().HasMaxLength(150);
        entity.HasIndex(cp => new { cp.CommunityId, cp.PlaylistId }).IsUnique();
        entity.HasOne(cp => cp.Community).WithMany(c => c.CommunityPlaylists).HasForeignKey(cp => cp.CommunityId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne(cp => cp.Playlist).WithMany(p => p.CommunityPlaylists).HasForeignKey(cp => cp.PlaylistId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class CommunitySongConfiguration : IEntityTypeConfiguration<CommunitySong>
{
    public void Configure(EntityTypeBuilder<CommunitySong> entity)
    {
        entity.ToTable("CommunitySongs");
        entity.HasKey(cs => cs.Id);
        entity.HasIndex(cs => new { cs.CommunityId, cs.SongId }).IsUnique();
        entity.HasOne(cs => cs.Community).WithMany(c => c.CommunitySongs).HasForeignKey(cs => cs.CommunityId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne(cs => cs.Song).WithMany(s => s.CommunitySongs).HasForeignKey(cs => cs.SongId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class CommunityCommentConfiguration : IEntityTypeConfiguration<CommunityComment>
{
    public void Configure(EntityTypeBuilder<CommunityComment> entity)
    {
        entity.ToTable("CommunityComments");
        entity.HasKey(cc => cc.Id);
        entity.Property(cc => cc.AuthorName).IsRequired().HasMaxLength(120);
        entity.Property(cc => cc.Content).IsRequired().HasMaxLength(1000);
        entity.HasIndex(cc => new { cc.CommunityId, cc.CreatedAt });
        entity.HasOne(cc => cc.Community).WithMany(c => c.Comments).HasForeignKey(cc => cc.CommunityId).OnDelete(DeleteBehavior.Cascade);
        entity.HasOne(cc => cc.Author).WithMany(u => u.CommunityComments).HasForeignKey(cc => cc.AuthorId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class RoomConfiguration : IEntityTypeConfiguration<Room>
{
    public void Configure(EntityTypeBuilder<Room> entity)
    {
        entity.ToTable("Rooms");
        entity.HasKey(r => r.Id);
        entity.Property(r => r.Code).IsRequired().HasMaxLength(20);
        entity.Property(r => r.Title).IsRequired().HasMaxLength(50);
        entity.Property(r => r.Genre).HasMaxLength(80).HasDefaultValue("General");
        entity.Property(r => r.AccessKey).HasMaxLength(6);
        entity.Property(r => r.MaxCapacity).HasDefaultValue(50);
        entity.Property(r => r.HostName).IsRequired().HasMaxLength(120);
        entity.Property(r => r.CurrentSongTitle).HasMaxLength(200);
        entity.Property(r => r.CurrentSongArtist).HasMaxLength(200);
        entity.Property(r => r.CurrentSongCoverUrl).HasMaxLength(1000);
        entity.Property(r => r.CurrentSongUrl).HasMaxLength(1000);
        entity.Property(r => r.IsActive).HasDefaultValue(true);
        entity.Property(r => r.SkipVoterIdsJson).HasDefaultValue("[]");
        entity.HasIndex(r => r.Code).IsUnique();
        entity.HasIndex(r => r.IsActive);
        entity.HasOne(r => r.Host).WithMany(u => u.HostedRooms).HasForeignKey(r => r.HostId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class RoomSongConfiguration : IEntityTypeConfiguration<RoomSong>
{
    public void Configure(EntityTypeBuilder<RoomSong> entity)
    {
        entity.ToTable("RoomSongs");
        entity.HasKey(rs => rs.Id);
        entity.Property(rs => rs.Title).IsRequired().HasMaxLength(200);
        entity.Property(rs => rs.Artist).IsRequired().HasMaxLength(200);
        entity.Property(rs => rs.Url).IsRequired().HasMaxLength(1000);
        entity.Property(rs => rs.CoverUrl).HasMaxLength(1000).HasDefaultValue(string.Empty);
        entity.Property(rs => rs.RequestedBy).HasMaxLength(120).HasDefaultValue("Anónimo");
        entity.Property(rs => rs.VoterIdsJson).HasDefaultValue("[]");
        entity.HasIndex(rs => new { rs.RoomId, rs.VoteCount, rs.OrderIndex });
        entity.HasOne(rs => rs.Room).WithMany(r => r.Queue).HasForeignKey(rs => rs.RoomId).OnDelete(DeleteBehavior.Cascade);
    }
}

public class RoomMessageConfiguration : IEntityTypeConfiguration<RoomMessage>
{
    public void Configure(EntityTypeBuilder<RoomMessage> entity)
    {
        entity.ToTable("RoomMessages");
        entity.HasKey(rm => rm.Id);
        entity.Property(rm => rm.SenderName).IsRequired().HasMaxLength(120);
        entity.Property(rm => rm.Content).IsRequired().HasMaxLength(1000);
        entity.HasIndex(rm => new { rm.RoomId, rm.SentAt });
        entity.HasOne(rm => rm.Room).WithMany(r => r.Messages).HasForeignKey(rm => rm.RoomId).OnDelete(DeleteBehavior.Cascade);
    }
}
