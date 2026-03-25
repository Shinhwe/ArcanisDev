using Microsoft.AspNetCore.Http.HttpResults;

public static class AuthEndpoints
{
    public static IEndpointRouteBuilder MapAuthEndpoints(this IEndpointRouteBuilder endpointRouteBuilder)
    {
        endpointRouteBuilder.MapPost("/api/v1/auth/register", HandleRegisterAsync)
            .WithName("RegisterAuthUser");

        endpointRouteBuilder.MapPost("/api/v1/auth/login", HandleLoginAsync)
            .WithName("LoginAuthUser");

        endpointRouteBuilder.MapGet("/api/v1/auth/me", HandleGetCurrentUserAsync)
            .WithName("GetCurrentAuthUser")
            .WithMetadata(new RequireCmsAuthAttribute());

        endpointRouteBuilder.MapPost("/api/v1/auth/logout", HandleLogoutAsync)
            .WithName("LogoutAuthUser")
            .WithMetadata(new RequireCmsAuthAttribute());

        return endpointRouteBuilder;
    }

    private static async Task<IResult> HandleGetCurrentUserAsync(
        HttpContext httpContext,
        AuthService authService,
        CancellationToken cancellationToken)
    {
        var authContext = httpContext.GetCmsAuthContext();

        if (authContext is null)
        {
            return TypedResults.Unauthorized();
        }

        var serviceResult = await authService.GetCurrentUserAsync(authContext.Token, cancellationToken);

        if (serviceResult.IsSuccess == false || serviceResult.Data is null)
        {
            return TypedResults.Unauthorized();
        }

        return TypedResults.Ok(serviceResult.Data);
    }

    private static async Task<IResult> HandleLoginAsync(
        LoginRequest request,
        HttpContext httpContext,
        AuthService authService,
        CancellationToken cancellationToken)
    {
        var serviceResult = await authService.LoginAsync(
            request,
            CreateAuthClientMetadata(httpContext),
            cancellationToken);

        if (serviceResult.IsSuccess && serviceResult.Data is not null)
        {
            return TypedResults.Ok(serviceResult.Data);
        }

        if (serviceResult.Error is null)
        {
            return TypedResults.Unauthorized();
        }

        if (serviceResult.Error.StatusCode == StatusCodes.Status401Unauthorized ||
            serviceResult.Error.StatusCode == StatusCodes.Status403Forbidden)
        {
            return Results.Json(
                new ApiErrorResponse(
                    Code: "auth.invalid_credentials",
                    Message: "Invalid username or password."),
                statusCode: StatusCodes.Status401Unauthorized);
        }

        return CreateApiErrorResult(serviceResult.Error);
    }

    private static async Task<IResult> HandleLogoutAsync(
        HttpContext httpContext,
        AuthService authService,
        CancellationToken cancellationToken)
    {
        var authContext = httpContext.GetCmsAuthContext();

        if (authContext is null)
        {
            return TypedResults.Unauthorized();
        }

        var serviceResult = await authService.LogoutAsync(authContext.Token, cancellationToken);

        if (serviceResult.IsSuccess == false)
        {
            return TypedResults.Unauthorized();
        }

        return TypedResults.NoContent();
    }

    private static async Task<IResult> HandleRegisterAsync(
        RegisterRequest request,
        HttpContext httpContext,
        AuthService authService,
        CancellationToken cancellationToken)
    {
        var serviceResult = await authService.RegisterAsync(
            request,
            CreateAuthClientMetadata(httpContext),
            cancellationToken);

        if (serviceResult.IsSuccess && serviceResult.Data is not null)
        {
            return TypedResults.Ok(serviceResult.Data);
        }

        if (serviceResult.Error is null)
        {
            return TypedResults.BadRequest();
        }

        return CreateApiErrorResult(serviceResult.Error);
    }

    private static AuthClientMetadata CreateAuthClientMetadata(HttpContext httpContext)
    {
        return new AuthClientMetadata(
            ClientIp: httpContext.Connection.RemoteIpAddress?.ToString(),
            UserAgent: httpContext.Request.Headers.UserAgent.ToString());
    }

    private static IResult CreateApiErrorResult(AuthServiceError authServiceError)
    {
        return Results.Json(
            new ApiErrorResponse(
                Code: authServiceError.Code,
                Message: authServiceError.Message,
                FieldErrors: authServiceError.FieldErrors),
            statusCode: authServiceError.StatusCode);
    }
}
