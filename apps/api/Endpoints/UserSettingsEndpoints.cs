public static class UserSettingsEndpoints
{
    public static IEndpointRouteBuilder MapUserSettingsEndpoints(
        this IEndpointRouteBuilder endpointRouteBuilder)
    {
        endpointRouteBuilder.MapPost(
                "/api/v1/users/me/email-verification-codes",
                HandleSendEmailVerificationCodeAsync)
            .WithName("SendCurrentUserEmailVerificationCode")
            .WithMetadata(new RequireCmsAuthAttribute());

        endpointRouteBuilder.MapPut("/api/v1/users/me/email", HandleChangeCurrentUserEmailAsync)
            .WithName("ChangeCurrentUserEmail")
            .WithMetadata(new RequireCmsAuthAttribute());

        endpointRouteBuilder.MapPut("/api/v1/users/me/password", HandleChangeCurrentUserPasswordAsync)
            .WithName("ChangeCurrentUserPassword")
            .WithMetadata(new RequireCmsAuthAttribute());

        return endpointRouteBuilder;
    }

    private static async Task<IResult> HandleChangeCurrentUserEmailAsync(
        ChangeEmailRequest request,
        HttpContext httpContext,
        UserSettingsService userSettingsService,
        CancellationToken cancellationToken)
    {
        var authContext = httpContext.GetCmsAuthContext();

        if (authContext is null)
        {
            return TypedResults.Unauthorized();
        }

        var serviceResult = await userSettingsService.ChangeEmailAsync(
            authContext.UserId,
            request,
            cancellationToken);

        if (serviceResult.IsSuccess && serviceResult.Data is not null)
        {
            return TypedResults.Ok(serviceResult.Data);
        }

        return CreateApiErrorResult(serviceResult.Error);
    }

    private static async Task<IResult> HandleChangeCurrentUserPasswordAsync(
        ChangePasswordRequest request,
        HttpContext httpContext,
        UserSettingsService userSettingsService,
        CancellationToken cancellationToken)
    {
        var authContext = httpContext.GetCmsAuthContext();

        if (authContext is null)
        {
            return TypedResults.Unauthorized();
        }

        var serviceResult = await userSettingsService.ChangePasswordAsync(
            authContext.UserId,
            request,
            cancellationToken);

        if (serviceResult.IsSuccess)
        {
            return TypedResults.NoContent();
        }

        return CreateApiErrorResult(serviceResult.Error);
    }

    private static async Task<IResult> HandleSendEmailVerificationCodeAsync(
        SendEmailVerificationCodeRequest request,
        HttpContext httpContext,
        UserSettingsService userSettingsService,
        CancellationToken cancellationToken)
    {
        var authContext = httpContext.GetCmsAuthContext();

        if (authContext is null)
        {
            return TypedResults.Unauthorized();
        }

        var serviceResult = await userSettingsService.SendEmailVerificationCodeAsync(
            authContext.UserId,
            request,
            cancellationToken);

        if (serviceResult.IsSuccess && serviceResult.Data is not null)
        {
            return TypedResults.Ok(serviceResult.Data);
        }

        return CreateApiErrorResult(serviceResult.Error);
    }

    private static IResult CreateApiErrorResult(AuthServiceError? authServiceError)
    {
        if (authServiceError is null)
        {
            return TypedResults.BadRequest();
        }

        return Results.Json(
            new ApiErrorResponse(
                Code: authServiceError.Code,
                Message: authServiceError.Message,
                FieldErrors: authServiceError.FieldErrors),
            statusCode: authServiceError.StatusCode);
    }
}
