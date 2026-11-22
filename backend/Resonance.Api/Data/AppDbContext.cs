using Microsoft.EntityFrameworkCore;
using Resonance.Api.Models;

namespace Resonance.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options)
    {
    }

    public DbSet<User> Users => Set<User>();
    public DbSet<Song> Songs => Set<Song>();
    public DbSet<UserFavoriteSong> UserFavoriteSongs => Set<UserFavoriteSong>();
    public DbSet<Review> Reviews => Set<Review>();
    public DbSet<Playlist> Playlists => Set<Playlist>();
    public DbSet<PlaylistSong> PlaylistSongs => Set<PlaylistSong>();
    public DbSet<Community> Communities => Set<Community>();
    public DbSet<CommunityMember> CommunityMembers => Set<CommunityMember>();
    public DbSet<CommunityPlaylist> CommunityPlaylists => Set<CommunityPlaylist>();
    public DbSet<CommunitySong> CommunitySongs => Set<CommunitySong>();
    public DbSet<CommunityComment> CommunityComments => Set<CommunityComment>();
    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<RoomSong> RoomSongs => Set<RoomSong>();
    public DbSet<RoomMessage> RoomMessages => Set<RoomMessage>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(AppDbContext).Assembly);
    }
}
