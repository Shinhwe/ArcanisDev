using Microsoft.AspNetCore.Http.HttpResults;

public static class VoteEndpoints
{
    public static IEndpointRouteBuilder MapVoteEndpoints(
        this IEndpointRouteBuilder endpointRouteBuilder)
    {
        endpointRouteBuilder.MapGet("/api/v1/votes/eligibility", HandleGetVoteEligibility)
            .WithName("GetVoteEligibility");

        return endpointRouteBuilder;
    }

    private static Ok<VoteEligibilityResponse> HandleGetVoteEligibility(
        HttpContext httpContext,
        VoteEligibilityService voteEligibilityService)
    {
        var voteEligibilityRecord = voteEligibilityService.GetVoteEligibility(
            httpContext.GetCmsAuthContext());

        return TypedResults.Ok(
            new VoteEligibilityResponse(
                CanVote: voteEligibilityRecord.CanVote,
                Status: voteEligibilityRecord.Status,
                Message: voteEligibilityRecord.Message,
                HasLinkedGameAccount: voteEligibilityRecord.HasLinkedGameAccount,
                VoteIntervalHours: voteEligibilityRecord.VoteIntervalHours,
                NextEligibleAt: voteEligibilityRecord.NextEligibleAt));
    }
}
