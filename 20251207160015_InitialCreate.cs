using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace ProductionRunnerAPI.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Players",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    Username = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Players", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Scores",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    PlayerId = table.Column<int>(type: "integer", nullable: false),
                    Points = table.Column<int>(type: "integer", nullable: false),
                    Level = table.Column<int>(type: "integer", nullable: false),
                    LivesRemaining = table.Column<int>(type: "integer", nullable: false),
                    ProductionOrdersCollected = table.Column<int>(type: "integer", nullable: false),
                    SensorsRepaired = table.Column<int>(type: "integer", nullable: false),
                    PlaytimeSeconds = table.Column<int>(type: "integer", nullable: false),
                    AchievedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Scores", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Scores_Players_PlayerId",
                        column: x => x.PlayerId,
                        principalTable: "Players",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "Players",
                columns: new[] { "Id", "CreatedAt", "Username" },
                values: new object[,]
                {
                    { 1, new DateTime(2024, 11, 1, 12, 0, 0, 0, DateTimeKind.Utc), "Joe" },
                    { 2, new DateTime(2024, 11, 5, 14, 30, 0, 0, DateTimeKind.Utc), "Freeman" },
                    { 3, new DateTime(2024, 11, 10, 9, 15, 0, 0, DateTimeKind.Utc), "TOM_S" }
                });

            migrationBuilder.InsertData(
                table: "Scores",
                columns: new[] { "Id", "AchievedAt", "Level", "LivesRemaining", "PlayerId", "PlaytimeSeconds", "Points", "ProductionOrdersCollected", "SensorsRepaired" },
                values: new object[,]
                {
                    { 1, new DateTime(2024, 11, 15, 10, 30, 0, 0, DateTimeKind.Utc), 5, 2, 1, 420, 8450, 280, 12 },
                    { 2, new DateTime(2024, 11, 18, 16, 45, 0, 0, DateTimeKind.Utc), 4, 1, 2, 380, 7280, 245, 10 },
                    { 3, new DateTime(2024, 11, 20, 20, 0, 0, 0, DateTimeKind.Utc), 4, 0, 3, 350, 6910, 230, 8 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_Players_Username",
                table: "Players",
                column: "Username",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Scores_PlayerId",
                table: "Scores",
                column: "PlayerId");

            migrationBuilder.CreateIndex(
                name: "IX_Scores_Points",
                table: "Scores",
                column: "Points");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Scores");

            migrationBuilder.DropTable(
                name: "Players");
        }
    }
}
