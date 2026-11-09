using Microsoft.EntityFrameworkCore;
using Resonance.Api.Models;

namespace Resonance.Api.Data;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<Room> Rooms => Set<Room>();
    public DbSet<RoomSong> RoomSongs => Set<RoomSong>();
    public DbSet<User> Users => Set<User>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

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
    }
}
