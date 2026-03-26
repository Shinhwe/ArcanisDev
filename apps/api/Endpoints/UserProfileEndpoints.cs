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
        IUserProfileRepository userProfileRepository,
        CancellationToken cancellationToken)
    {
        var authContext = httpContext.GetCmsAuthContext()!;
        var userGameAccountRecord = await userProfileRepository.GetGameAccountByUsernameAsync(
            authContext.Username,
            cancellationToken);

        return TypedResults.Ok(
            new CurrentUserProfileResponse(
                User: new AuthUserResponse(
                    Id: authContext.UserId,
                    Username: authContext.Username,
                    Email: authContext.Email,
                    Role: authContext.Role),
                GameAccount: CreateUserGameAccountResponse(userGameAccountRecord)));
    }

    private static UserGameAccountResponse CreateUserGameAccountResponse(
        UserGameAccountRecord? userGameAccountRecord)
    {
        if (userGameAccountRecord is null)
        {
            return new UserGameAccountResponse(
                DonationPoints: 0,
                IsLinked: false,
                MaplePoints: 0,
                NxPrepaid: 0,
                VotePoints: 0);
        }

        return new UserGameAccountResponse(
            DonationPoints: userGameAccountRecord.DonationPoints,
            IsLinked: true,
            MaplePoints: userGameAccountRecord.MaplePoints,
            NxPrepaid: userGameAccountRecord.NxPrepaid,
            VotePoints: userGameAccountRecord.VotePoints);
    }
}
