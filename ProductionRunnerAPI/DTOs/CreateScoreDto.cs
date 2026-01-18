using System.ComponentModel.DataAnnotations;

namespace ProductionRunnerAPI.DTOs;

public class CreateScoreDto
{
    [Required]
    [StringLength(100)]
    public string Username { get; set; } = string.Empty;

    [Range(0, int.MaxValue)]
    public int Points { get; set; }

    [Range(1, int.MaxValue)]
    public int Level { get; set; }

    [Range(0, int.MaxValue)]
    public int LivesRemaining { get; set; }

    [Range(0, int.MaxValue)]
    public int ProductionOrdersCollected { get; set; }

    [Range(0, int.MaxValue)]
    public int SensorsRepaired { get; set; }

    [Range(0, int.MaxValue)]
    public int PlaytimeSeconds { get; set; }

    // 2-Player mode support
    public bool IsTwoPlayerMode { get; set; } = false;

    [StringLength(100)]
    public string? Player2Username { get; set; }
}
