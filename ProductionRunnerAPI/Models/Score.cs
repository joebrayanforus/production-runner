namespace ProductionRunnerAPI.Models;

public class Score
{
    public int Id { get; set; }

    public int PlayerId { get; set; }
    public Player Player { get; set; } = null!;
    
    public int Points { get; set; }
    public int Level { get; set; }
    public int LivesRemaining { get; set; }
    public int ProductionOrdersCollected { get; set; }
    public int SensorsRepaired { get; set; }
    public int PlaytimeSeconds { get; set; }
    public DateTime AchievedAt { get; set; }

}