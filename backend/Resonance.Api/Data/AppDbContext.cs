using Microsoft.EntityFrameworkCore;
using Resonance.Api.Models;

namespace Resonance.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<RoomSong> RoomSongs => Set<RoomSong>();
    public DbSet<User> Users => Set<User>();
    public DbSet<Playlist> Playlists => Set<Playlist>();
    public DbSet<Song> Songs => Set<Song>();
    public DbSet<Community> Communities => Set<Community>();
    public DbSet<CommunityPlaylist> CommunityPlaylists => Set<CommunityPlaylist>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<Community>(entity =>
        {
            entity.HasKey(c => c.Id);
            entity.HasIndex(c => c.NormalizedName).IsUnique();
            entity.Property(c => c.Name).IsRequired().HasMaxLength(100);
            entity.Property(c => c.NormalizedName).IsRequired().HasMaxLength(100);
            entity.Property(c => c.CategoryValue).IsRequired().HasMaxLength(100);
            entity.Property(c => c.CreatorId).IsRequired().HasMaxLength(100);

            entity.HasMany(c => c.Playlists)
                  .WithOne(cp => cp.Community)
                  .HasForeignKey(cp => cp.CommunityId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<CommunityPlaylist>(entity =>
        {
            entity.HasKey(cp => cp.Id);
            entity.HasIndex(cp => new { cp.CommunityId, cp.PlaylistId }).IsUnique();
            entity.Property(cp => cp.PlaylistId).IsRequired().HasMaxLength(100);
            entity.Property(cp => cp.PlaylistTitle).IsRequired().HasMaxLength(150);
        });

        modelBuilder.Entity<Room>(entity =>
        {
            entity.HasKey(r => r.Id);
            entity.HasIndex(r => r.Code).IsUnique();
            entity.Property(r => r.Title).IsRequired().HasMaxLength(100);
            entity.Property(r => r.Code).IsRequired().HasMaxLength(16);

            entity.HasMany(r => r.Queue)
                  .WithOne()
                  .HasForeignKey(rs => rs.RoomId)
                  .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(u => u.Id);
            entity.HasIndex(u => u.Email).IsUnique();
            entity.Property(u => u.Email).IsRequired().HasMaxLength(150);
            entity.Property(u => u.Name).IsRequired().HasMaxLength(100);
        });

        modelBuilder.Entity<Playlist>(entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Name).IsRequired().HasMaxLength(60);
            entity.Property(p => p.UserId).IsRequired();
        });

        modelBuilder.Entity<Song>(entity =>
        {
            entity.HasKey(s => s.Id);
            entity.Property(s => s.Title).IsRequired().HasMaxLength(100);
            entity.Property(s => s.Artist).IsRequired().HasMaxLength(100);
        });
    }
}
