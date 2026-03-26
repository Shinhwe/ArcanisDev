public interface IAuthRepository
{
    Task<AuthTokenRecord> CreateTokenAsync(
        long userId,
        string token,
        string? clientIp,
        string? userAgent,
        CancellationToken cancellationToken);

    Task<AuthUserRecord> CreateUserAsync(
        string username,
        string email,
        string passwordHash,
        string role,
        string status,
        CancellationToken cancellationToken);

    Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken);

    Task<AuthTokenRecord?> GetActiveTokenAsync(string token, CancellationToken cancellationToken);

    Task<AuthUserRecord?> GetUserByIdAsync(long userId, CancellationToken cancellationToken);

    Task<AuthUserRecord?> GetUserByUsernameAsync(string username, CancellationToken cancellationToken);

    Task RevokeTokenAsync(string token, string revokedReason, CancellationToken cancellationToken);

    Task RevokeAllTokensForUserAsync(long userId, string revokedReason, CancellationToken cancellationToken);

    Task TouchTokenAsync(string token, CancellationToken cancellationToken);

    Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken);
}
