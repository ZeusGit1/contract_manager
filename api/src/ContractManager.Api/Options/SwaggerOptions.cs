namespace ContractManager.Api.Options;

public class SwaggerOptions
{
    /// <summary>
    /// Per api-coding-standards.md: Swagger UI is gated by this flag, NOT by IsDevelopment().
    /// Default false so it's off unless explicitly enabled.
    /// </summary>
    public bool Enabled { get; set; }
}
