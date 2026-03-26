public sealed class UserProfileRepository : IUserProfileRepository
{
    public Task<UserGameAccountRecord?> GetGameAccountByUsernameAsync(
        string username,
        CancellationToken cancellationToken)
    {
        return Task.FromResult<UserGameAccountRecord?>(null);
    }
}
