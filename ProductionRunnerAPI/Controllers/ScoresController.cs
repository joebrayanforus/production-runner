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

    // GET: api/scores/leaderboard
    [HttpGet("leaderboard")]
    public async Task<ActionResult<IEnumerable<LeaderboardEntryDto>>> GetLeaderboard([FromQuery] int top = 10)
    {
        var leaderboard = await _context.Scores
            .Include(s => s.Player)
            .OrderByDescending(s => s.Points)
            .Take(top)
            .Select((s, index) => new LeaderboardEntryDto
            {
                Rank = index + 1,
                Username = s.Player.Username,
                Points = s.Points,
                Level = s.Level,
                SensorsRepaired = s.SensorsRepaired,
                AchievedAt = s.AchievedAt
            })
            .ToListAsync();

        return Ok(leaderboard);
    }

    // POST: api/scores
    [HttpPost]
    public async Task<ActionResult<Score>> CreateScore(CreateScoreDto dto)
    {
        // Spieler finden oder erstellen
        var player = await _context.Players.FirstOrDefaultAsync(p => p.Username == dto.Username);
        if (player == null)
        {
            player = new Player 
            { 
                Username = dto.Username,
                CreatedAt = DateTime.UtcNow 
            };
            _context.Players.Add(player);
            await _context.SaveChangesAsync();
        }

        // Score erstellen
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

        // SignalR: Broadcast an alle Clients
        await _hubContext.Clients.All.SendAsync("ReceiveNewScore", dto.Username, dto.Points);

        return CreatedAtAction(nameof(GetLeaderboard), new { id = score.Id }, score);
    }

    // GET: api/scores/{id}
    [HttpGet("{id}")]
    public async Task<ActionResult<Score>> GetScore(int id)
    {
        var score = await _context.Scores
            .Include(s => s.Player)
            .FirstOrDefaultAsync(s => s.Id == id);

        if (score == null)
            return NotFound();

        return Ok(score);
    }
}