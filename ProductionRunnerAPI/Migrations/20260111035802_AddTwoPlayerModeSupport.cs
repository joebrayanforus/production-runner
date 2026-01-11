using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ProductionRunnerAPI.Migrations
{
    /// <inheritdoc />
    public partial class AddTwoPlayerModeSupport : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsTwoPlayerMode",
                table: "Scores",
                type: "INTEGER",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<int>(
                name: "Player2Id",
                table: "Scores",
                type: "INTEGER",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Scores_Player2Id",
                table: "Scores",
                column: "Player2Id");

            migrationBuilder.AddForeignKey(
                name: "FK_Scores_Players_Player2Id",
                table: "Scores",
                column: "Player2Id",
                principalTable: "Players",
                principalColumn: "Id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Scores_Players_Player2Id",
                table: "Scores");

            migrationBuilder.DropIndex(
                name: "IX_Scores_Player2Id",
                table: "Scores");

            migrationBuilder.DropColumn(
                name: "IsTwoPlayerMode",
                table: "Scores");

            migrationBuilder.DropColumn(
                name: "Player2Id",
                table: "Scores");
        }
    }
}
