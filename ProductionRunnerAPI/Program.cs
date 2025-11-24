using Microsoft.EntityFrameworkCore;
using ProductionRunnerAPI.Data;
using ProductionRunnerAPI.Hubs;


var builder = WebApplication.CreateBuilder(args);

// Add services to the container.
// Learn more about configuring OpenAPI at https://aka.ms/aspnet/openapi

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen(); 

builder.Services.AddDbContext<ApplicationDbContext>(options =>
    options.UseSqlite("Data Source=productionrunner.db")); 

    builder.Services.AddSignalR();

    builder.Services.AddCors(options =>
    {
    options.AddPolicy("AllowAll", policy =>
       { 
                 policy.AllowAnyOrigin()
                  .AllowAnyMethod()
                  .AllowAnyHeader();
        });
    });
    var app = builder.Build();
    
// Configure the HTTP request pipeline.

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}  

app.UseCors("AllowAll");
app.UseAuthorization();
app.MapControllers();

// SignalR Hub Mapping
app.MapHub<LeaderboardHub>("/leaderboardHub");

app.Run();