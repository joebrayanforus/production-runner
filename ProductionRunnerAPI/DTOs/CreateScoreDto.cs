namespace ProductionRunnerAPI.DTOs;

public class CreateScoreDto
{
    public string Username { get; set; } = string.Empty;
    public int Points { get; set; }
    public int Level { get; set; }
    public int LivesRemaining { get; set; }
    public int ProductionOrdersCollected { get; set; }
    public int SensorsRepaired { get; set; }
    public int PlaytimeSeconds { get; set; }
}