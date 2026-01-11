namespace ProductionRunnerAPI.DTOs;

public class LeaderboardEntryDto
{
    public int Rank { get; set; }
    public string Username { get; set; } = string.Empty;
    public int Points { get; set; }
    public int Level { get; set; }
    public int SensorsRepaired { get; set; }
    public string AchievedAt { get; set; } = string.Empty;
    public bool IsTwoPlayerMode { get; set; }
    public string? Player2Username { get; set; }
}
