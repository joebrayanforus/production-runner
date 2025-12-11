using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using Microsoft.EntityFrameworkCore;
using ProductionRunnerAPI.Data;
using ProductionRunnerAPI.DTOs;
using ProductionRunnerAPI.Models;
using ProductionRunnerAPI.Hubs;

namespace ProductionRunnerAPI.Controllers;

[ApiController]
[Route("api/[controller]")]
public class ScoresController : ControllerBase
{
    private readonly ApplicationDbContext _context;
    private readonly IHubContext<LeaderboardHub> _hubContext;

    public ScoresController(ApplicationDbContext context, IHubContext<LeaderboardHub> hubContext)
    {
        _context = context;
        _hubContext = hubContext;
    }

    private async Task<List<LeaderboardEntryDto>> BuildLeaderboardAsync(int top = 10)
    {
        var boundedTop = Math.Clamp(top, 1, 100);

        var scores = await _context.Scores
            .Include(s => s.Player)
            .OrderByDescending(s => s.Points)
            .Take(boundedTop)
            .ToListAsync();

        var result = new List<LeaderboardEntryDto>(scores.Count);

        for (var i = 0; i < scores.Count; i++)
        {
            var s = scores[i];

            result.Add(new LeaderboardEntryDto
            {
                Rank = i + 1,
                Username = s.Player.Username,
                Points = s.Points,
                Level = s.Level,
                SensorsRepaired = s.SensorsRepaired,
                AchievedAt = s.AchievedAt.ToString("yyyy-MM-ddTHH:mm:ssZ")
            });
        }

        return result;
    }

    // GET: api/scores/leaderboard?top=10
    [HttpGet("leaderboard")]
    public async Task<ActionResult<IEnumerable<LeaderboardEntryDto>>> GetLeaderboard([FromQuery] int top = 10)
    {
        var leaderboard = await BuildLeaderboardAsync(top);
        return Ok(leaderboard);
    }

    // POST: api/scores
    [HttpPost]
    public async Task<ActionResult<Score>> CreateScore([FromBody] CreateScoreDto dto)
    {
        var username = dto.Username?.Trim() ?? string.Empty;
        if (string.IsNullOrWhiteSpace(username))
        {
            return BadRequest("Username is required.");
        }

        var player = await _context.Players
            .FirstOrDefaultAsync(p => p.Username == username);

        if (player == null)
        {
            player = new Player
            {
                Username = username,
                CreatedAt = DateTime.UtcNow
            };

            _context.Players.Add(player);
            await _context.SaveChangesAsync();
        }

        var score = new Score
        {
            PlayerId = player.Id,
            Points = dto.Points,
            Level = dto.Level,
            LivesRemaining = dto.LivesRemaining,
            ProductionOrdersCollected = dto.ProductionOrdersCollected,
            SensorsRepaired = dto.SensorsRepaired,
            PlaytimeSeconds = dto.PlaytimeSeconds,
            AchievedAt = DateTime.UtcNow
        };

        _context.Scores.Add(score);
        await _context.SaveChangesAsync();

        var leaderboard = await BuildLeaderboardAsync(10);

        await _hubContext.Clients.All.SendAsync("LeaderboardUpdated", leaderboard);

        await _hubContext.Clients.All.SendAsync("ReceiveNewScore", dto.Username, dto.Points);
        //await _hubContext.Clients.All.SendAsync("ReceiveNewScore",player.Username,score.Points);
        
        return CreatedAtAction(nameof(GetScore), new { id = score.Id }, score);
    }

    // GET: api/scores/{id}
    [HttpGet("{id:int}")]
    public async Task<ActionResult<Score>> GetScore(int id)
    {
        var score = await _context.Scores
            .Include(s => s.Player)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (score == null)
        {
            return NotFound();
        }

        return Ok(score);
    }
}
