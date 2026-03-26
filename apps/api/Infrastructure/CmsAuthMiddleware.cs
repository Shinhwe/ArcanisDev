using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

public sealed class CmsAuthMiddleware
{
    private readonly ILogger<CmsAuthMiddleware> logger;
    private readonly RequestDelegate next;

    public CmsAuthMiddleware(RequestDelegate next)
        : this(next, NullLogger<CmsAuthMiddleware>.Instance)
    {
    }

    public CmsAuthMiddleware(RequestDelegate next, ILogger<CmsAuthMiddleware> logger)
    {
        this.next = next;
        this.logger = logger;
    }

    public async Task InvokeAsync(HttpContext httpContext, IAuthRepository authRepository)
    {
        var bearerToken = GetBearerToken(httpContext.Request.Headers.Authorization.ToString());

        if (string.IsNullOrWhiteSpace(bearerToken) == false)
        {
            var activeTokenRecord = await authRepository.GetActiveTokenAsync(
                bearerToken,
                httpContext.RequestAborted);

            if (activeTokenRecord is null)
            {
                logger.LogInformation(
                    "Bearer token rejected for path {RequestPath}: token was not active.",
                    httpContext.Request.Path);
            }
            else
            {
                var userRecord = await authRepository.GetUserByIdAsync(
                    activeTokenRecord.UserId,
                    httpContext.RequestAborted);

                if (userRecord is null)
                {
                    logger.LogWarning(
                        "Bearer token {TokenId} rejected for path {RequestPath}: user {UserId} was missing.",
                        activeTokenRecord.Id,
                        httpContext.Request.Path,
                        activeTokenRecord.UserId);
                }
                else if (userRecord.Status != "active")
                {
                    logger.LogWarning(
                        "Bearer token {TokenId} rejected for path {RequestPath}: user {UserId} status was {UserStatus}.",
                        activeTokenRecord.Id,
                        httpContext.Request.Path,
                        activeTokenRecord.UserId,
                        userRecord.Status);
                }
                else
                {
                    httpContext.SetCmsAuthContext(
                        new CmsAuthContext(
                            UserId: userRecord.Id,
                            Username: userRecord.Username,
                            Email: userRecord.Email,
                            Role: userRecord.Role,
                            Token: activeTokenRecord.Token));

                    await authRepository.TouchTokenAsync(activeTokenRecord.Token, httpContext.RequestAborted);
                }
            }
        }

        var endpoint = httpContext.GetEndpoint();
        var requiresAuth = endpoint?.Metadata.GetMetadata<RequireCmsAuthAttribute>() is not null;

        if (requiresAuth && httpContext.GetCmsAuthContext() is null)
        {
            logger.LogInformation(
                "Protected request to path {RequestPath} returned 401 without an auth context.",
                httpContext.Request.Path);
            httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return;
        }

        await next(httpContext);
    }

    private static string? GetBearerToken(string? authorizationHeaderValue)
    {
        if (string.IsNullOrWhiteSpace(authorizationHeaderValue))
        {
            return null;
        }

        if (authorizationHeaderValue.StartsWith("Bearer ", StringComparison.OrdinalIgnoreCase) == false)
        {
            return null;
        }

        var token = authorizationHeaderValue["Bearer ".Length..].Trim();

        if (string.IsNullOrWhiteSpace(token))
        {
            return null;
        }

        return token;
    }
}
