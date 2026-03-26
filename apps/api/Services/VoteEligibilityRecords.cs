public sealed record VoteEligibilityRecord(
    bool CanVote,
    string Status,
    string Message,
    bool HasLinkedGameAccount,
    int VoteIntervalHours,
    DateTimeOffset? NextEligibleAt);
