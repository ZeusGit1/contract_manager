using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ContractManager.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddAccessesClientMatter : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "AccessesClientMatter",
                table: "Contracts",
                type: "bit",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AccessesClientMatter",
                table: "Contracts");
        }
    }
}
