using ContractManager.Api.Options;
using Microsoft.Extensions.Options;

namespace ContractManager.Api.Middleware;

/// <summary>
/// AFD lockdown — when configured, only allow requests carrying the matching X-Azure-FDID header.
/// No-op when Security:FrontDoor:FrontDoorId is unset. Per api-auth.md — placed after OperationId,
/// before UseAuthentication. Reject with 403 (never 401) on mismatch.
/// </summary>
public class FrontDoorLockdownMiddleware
{
    private const string FrontDoorHeader = "X-Azure-FDID";
    private readonly RequestDelegate _next;
    private readonly IOptions<SecurityOptions> _options;

    public FrontDoorLockdownMiddleware(RequestDelegate next, IOptions<SecurityOptions> options)
    {
        _next = next;
        _options = options;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        var expected = _options.Value.FrontDoor.FrontDoorId;

        if (string.IsNullOrWhiteSpace(expected))
        {
            // Not enforced — local dev / non-AFD environments
            await _next(context).ConfigureAwait(false);
            return;
        }

        if (context.Request.Headers.TryGetValue(FrontDoorHeader, out var actual)
            && string.Equals(actual.ToString(), expected, StringComparison.Ordinal))
        {
            await _next(context).ConfigureAwait(false);
            return;
        }

        context.Response.StatusCode = StatusCodes.Status403Forbidden;
    }
}
