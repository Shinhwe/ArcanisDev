using Microsoft.AspNetCore.Http.HttpResults;

public static class UserProfileEndpoints
{
    public static IEndpointRouteBuilder MapUserProfileEndpoints(
        this IEndpointRouteBuilder endpointRouteBuilder)
    {
        endpointRouteBuilder.MapGet("/api/v1/users/me/profile", HandleGetCurrentUserProfileAsync)
            .WithName("GetCurrentUserProfile")
            .WithMetadata(new RequireCmsAuthAttribute());

        return endpointRouteBuilder;
    }

    private static async Task<Ok<CurrentUserProfileResponse>> HandleGetCurrentUserProfileAsync(
        HttpContext httpContext,
        CancellationToken cancellationToken)
    {
        var authContext = httpContext.GetCmsAuthContext()!;

        return TypedResults.Ok(
            new CurrentUserProfileResponse(
                User: new AuthUserResponse(
                    Id: authContext.UserId,
                    Username: authContext.Username,
                    Email: authContext.Email,
                    Role: authContext.Role),
                GameAccount: new UserGameAccountResponse(
                    DonationPoints: null,
                    IsLinked: false,
                    MaplePoints: null,
                    NxPrepaid: null,
                    VotePoints: null)));
    }
}
