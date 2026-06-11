namespace ContractManager.Api.Middleware;

/// <summary>
/// Baseline security headers per api-performance.md. Strict CSP on every API response;
/// a relaxed Swashbuckle-compatible CSP on /swagger/* paths only.
/// </summary>
public class SecurityHeadersMiddleware
{
    private const string DefaultCsp = "default-src 'none'; frame-ancestors 'none'";
    private const string SwaggerCsp =
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; " +
        "img-src 'self' data:; font-src 'self' data:; connect-src 'self'; frame-ancestors 'none'";

    private readonly RequestDelegate _next;

    public SecurityHeadersMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        var isSwaggerPath = context.Request.Path.StartsWithSegments("/swagger", StringComparison.OrdinalIgnoreCase);

        context.Response.OnStarting(() =>
        {
            var headers = context.Response.Headers;
            headers["Content-Security-Policy"] = isSwaggerPath ? SwaggerCsp : DefaultCsp;
            headers["X-Content-Type-Options"] = "nosniff";
            headers["Referrer-Policy"] = "no-referrer";
            // HSTS only when behind HTTPS — set unconditionally; browsers ignore over HTTP.
            headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
            return Task.CompletedTask;
        });

        await _next(context).ConfigureAwait(false);
    }
}
