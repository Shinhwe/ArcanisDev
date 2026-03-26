public sealed class VoteEligibilityService
{
    public VoteEligibilityRecord GetVoteEligibility(CmsAuthContext? authContext)
    {
        if (authContext is null)
        {
            return new VoteEligibilityRecord(
                CanVote: false,
                Status: "login_required",
                Message: "Login is required before voting.",
                HasLinkedGameAccount: false,
                VoteIntervalHours: 24,
                NextEligibleAt: null);
        }

        // TODO: Replace this placeholder with a real linked-game-account lookup.
        // TODO: Evaluate the 24-hour cooldown when real vote records exist.
        // TODO: Add POST /api/v1/votes and enqueue successful vote events to Redis.
        return new VoteEligibilityRecord(
            CanVote: false,
            Status: "link_required",
            Message: "Link a game account before voting.",
            HasLinkedGameAccount: false,
            VoteIntervalHours: 24,
            NextEligibleAt: null);
    }
}
