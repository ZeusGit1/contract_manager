namespace ContractManager.Api.Middleware;

/// <summary>
/// Sets Cache-Control: private, no-store as the default on every authenticated API response,
/// per api-coding-standards.md. Endpoints that need a different policy override before the
/// response is sent.
/// </summary>
public class CacheControlDefaultMiddleware
{
    private const string HeaderName = "Cache-Control";
    private const string Default = "private, no-store";
    private readonly RequestDelegate _next;

    public CacheControlDefaultMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        context.Response.OnStarting(() =>
        {
            if (!context.Response.Headers.ContainsKey(HeaderName))
            {
                context.Response.Headers[HeaderName] = Default;
            }
            return Task.CompletedTask;
        });
        await _next(context).ConfigureAwait(false);
    }
}
