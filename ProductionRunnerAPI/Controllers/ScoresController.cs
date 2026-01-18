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
            .Include(s => s.Player2)
            .OrderByDescending(s => s.Points)
            .Take(boundedTop)
            .ToListAsync();

        var result = new List<LeaderboardEntryDto>(scores.Count);

        for (var i = 0; i < scores.Count; i++)
        {
            var s = scores[i];
            var username = s.Player.Username;

            // If 2-player mode, combine both usernames
            if (s.IsTwoPlayerMode && s.Player2 != null)
            {
                username = $"{s.Player.Username} & {s.Player2.Username}";
            }

            result.Add(new LeaderboardEntryDto
            {
                Rank = i + 1,
                Username = username,
                Points = s.Points,
                Level = s.Level,
                SensorsRepaired = s.SensorsRepaired,
                AchievedAt = s.AchievedAt.ToString("yyyy-MM-ddTHH:mm:ssZ"),
                IsTwoPlayerMode = s.IsTwoPlayerMode,
                Player2Username = s.Player2?.Username
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
            AchievedAt = DateTime.UtcNow,
            IsTwoPlayerMode = dto.IsTwoPlayerMode
        };

        // Handle 2-player mode
        if (dto.IsTwoPlayerMode && !string.IsNullOrWhiteSpace(dto.Player2Username))
        {
            var player2Username = dto.Player2Username.Trim();
            var player2 = await _context.Players
                .FirstOrDefaultAsync(p => p.Username == player2Username);

            if (player2 == null)
            {
                player2 = new Player
                {
                    Username = player2Username,
                    CreatedAt = DateTime.UtcNow
                };

                _context.Players.Add(player2);
                await _context.SaveChangesAsync();
            }

            score.Player2Id = player2.Id;
        }

        _context.Scores.Add(score);
        await _context.SaveChangesAsync();

        var leaderboard = await BuildLeaderboardAsync(10);

        await _hubContext.Clients.All.SendAsync("LeaderboardUpdated", leaderboard);

        // Notify for both players in 2-player mode
        if (dto.IsTwoPlayerMode && !string.IsNullOrWhiteSpace(dto.Player2Username))
        {
            await _hubContext.Clients.All.SendAsync("ReceiveNewScore",
                $"{dto.Username} & {dto.Player2Username}", dto.Points);
        }
        else
        {
            await _hubContext.Clients.All.SendAsync("ReceiveNewScore", dto.Username, dto.Points);
        }
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
