public sealed class InMemoryUserProfileRepository : IUserProfileRepository
{
    private readonly Dictionary<string, UserGameAccountRecord> gameAccountsByUsername = new(
        StringComparer.Ordinal);

    public Task<UserGameAccountRecord?> GetGameAccountByUsernameAsync(
        string username,
        CancellationToken cancellationToken)
    {
        gameAccountsByUsername.TryGetValue(username, out var userGameAccountRecord);

        return Task.FromResult(userGameAccountRecord);
    }

    public void SeedGameAccount(
        string username,
        int votePoints,
        int donationPoints,
        int maplePoints,
        int nxPrepaid)
    {
        gameAccountsByUsername[username] = new UserGameAccountRecord(
            DonationPoints: donationPoints,
            MaplePoints: maplePoints,
            NxPrepaid: nxPrepaid,
            VotePoints: votePoints);
    }
}
