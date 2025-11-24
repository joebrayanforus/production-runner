using Microsoft.AspNetCore.SignalR;

namespace ProductionRunnerAPI.Hubs;

public class LeaderboardHub : Hub
{
    public async Task BroadcastNewScore(string username , int points)  
    {
        await Clients.All.SendAsync("ReceiveNewScore", username, points);
    }
     public override async Task OnConnectedAsync()
    {
        await Clients.Caller.SendAsync("Connected", Context.ConnectionId);
        await base.OnConnectedAsync();
    }
}