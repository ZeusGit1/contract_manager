using Serilog.Context;

namespace ContractManager.Api.Middleware;

/// <summary>
/// Generates an OperationId (correlation ID) for every request, pushes it into Serilog
/// LogContext so every log entry on this request carries it, and echoes it on the response
/// header X-Operation-Id. Per api-logging.md — first content-touching middleware.
/// </summary>
public class OperationIdMiddleware
{
    private const string HeaderName = "X-Operation-Id";
    private readonly RequestDelegate _next;

    public OperationIdMiddleware(RequestDelegate next) => _next = next;

    public async Task InvokeAsync(HttpContext context)
    {
        // Accept the inbound header so a caller chain can carry one through; otherwise generate.
        var operationId = context.Request.Headers.TryGetValue(HeaderName, out var inbound)
                          && !string.IsNullOrWhiteSpace(inbound)
            ? inbound.ToString()
            : Guid.NewGuid().ToString("N");

        context.Items["OperationId"] = operationId;

        context.Response.OnStarting(() =>
        {
            context.Response.Headers[HeaderName] = operationId;
            return Task.CompletedTask;
        });

        using (LogContext.PushProperty("OperationId", operationId))
        {
            await _next(context).ConfigureAwait(false);
        }
    }
}
