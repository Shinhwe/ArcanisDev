public sealed record VoteEligibilityResponse(
    bool CanVote,
    string Status,
    string Message,
    bool HasLinkedGameAccount,
    int VoteIntervalHours,
    DateTimeOffset? NextEligibleAt);
