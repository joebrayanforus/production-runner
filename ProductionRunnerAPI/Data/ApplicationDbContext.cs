using Microsoft.EntityFrameworkCore;
using ProductionRunnerAPI.Models;

namespace ProductionRunnerAPI.Data;

public class ApplicationDbContext : DbContext
{
    public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options)
    {
    }

    public DbSet<Player> Players { get; set; } = null!;
    public DbSet<Score> Scores { get; set; } = null!;

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Definieren der Beziehung zwischen Player und Score

        modelBuilder.Entity<Player>( entity =>
        {
            entity.HasKey(p => p.Id);
            entity.Property(p => p.Username).IsRequired().HasMaxLength(100);
            entity.HasIndex(p => p.Username).IsUnique();
        });
        
        modelBuilder.Entity<Score>( entity => 
        {entity.HasKey(s => s.Id);
            entity.HasOne(s => s.Player)
            .WithMany(p => p.Scores)
            .HasForeignKey(s => s.PlayerId);
        
         entity.HasIndex(s => s.Points);
        });


        // Test-Spieler mit statischen Zeitstempeln
        modelBuilder.Entity<Player>().HasData(
            new Player { Id = 1, Username = "Joe", CreatedAt = new DateTime(2024, 11, 1, 12, 0, 0, DateTimeKind.Utc) },
            new Player { Id = 2, Username = "Freeman", CreatedAt = new DateTime(2024, 11, 5, 14, 30, 0, DateTimeKind.Utc) },
            new Player { Id = 3, Username = "TOM_S", CreatedAt = new DateTime(2024, 11, 10, 9, 15, 0, DateTimeKind.Utc) }
        );

        // Test-Scores mit statischen Zeitstempeln
        modelBuilder.Entity<Score>().HasData(
            new Score 
            { 
                Id = 1, 
                PlayerId = 1, 
                Points = 8450, 
                Level = 5, 
                LivesRemaining = 2, 
                ProductionOrdersCollected = 280, 
                SensorsRepaired = 12, 
                PlaytimeSeconds = 420,
                AchievedAt = new DateTime(2024, 11, 15, 10, 30, 0, DateTimeKind.Utc)
            },
            new Score 
            { 
                Id = 2, 
                PlayerId = 2, 
                Points = 7280, 
                Level = 4, 
                LivesRemaining = 1, 
                ProductionOrdersCollected = 245, 
                SensorsRepaired = 10, 
                PlaytimeSeconds = 380,
                AchievedAt = new DateTime(2024, 11, 18, 16, 45, 0, DateTimeKind.Utc)
            },
            new Score 
            { 
                Id = 3, 
                PlayerId = 3, 
                Points = 6910, 
                Level = 4, 
                LivesRemaining = 0, 
                ProductionOrdersCollected = 230, 
                SensorsRepaired = 8, 
                PlaytimeSeconds = 350,
                AchievedAt = new DateTime(2024, 11, 20, 20, 0, 0, DateTimeKind.Utc)
            }
        );


    
    }}