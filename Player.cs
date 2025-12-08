namespace ProductionRunnerAPI.Models;

public class Player
{
    public int Id { get; set; }
    public string Username { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }

    public ICollection<Score> Scores { get; set; } = new List<Score>();
}   