public interface IUserProfileRepository
{
    Task<UserGameAccountRecord?> GetGameAccountByUsernameAsync(
        string username,
        CancellationToken cancellationToken);
}
