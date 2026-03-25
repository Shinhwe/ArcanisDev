public sealed class InMemoryAuthRepository : IAuthRepository
{
    private long nextTokenId = 1;
    private long nextUserId = 1;

    public List<AuthTokenRecord> Tokens { get; } = [];

    public List<AuthUserRecord> Users { get; } = [];

    public Task<AuthTokenRecord> CreateTokenAsync(
        long userId,
        string token,
        string? clientIp,
        string? userAgent,
        CancellationToken cancellationToken)
    {
        var tokenRecord = new AuthTokenRecord(
            Id: nextTokenId++,
            UserId: userId,
            Token: token,
            CreatedAt: DateTime.UtcNow,
            LastUsedAt: null,
            RevokedAt: null,
            RevokedReason: null,
            ClientIp: clientIp,
            UserAgent: userAgent);

        Tokens.Add(tokenRecord);

        return Task.FromResult(tokenRecord);
    }

    public Task<AuthUserRecord> CreateUserAsync(
        string username,
        string email,
        string passwordHash,
        string role,
        string status,
        CancellationToken cancellationToken)
    {
        var userRecord = new AuthUserRecord(
            Id: nextUserId++,
            Username: username,
            Email: email,
            PasswordHash: passwordHash,
            Role: role,
            Status: status,
            CreatedAt: DateTime.UtcNow,
            UpdatedAt: DateTime.UtcNow);

        Users.Add(userRecord);

        return Task.FromResult(userRecord);
    }

    public Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken)
    {
        return Task.FromResult(Users.Any((userRecord) => userRecord.Email == email));
    }

    public Task<AuthTokenRecord?> GetActiveTokenAsync(string token, CancellationToken cancellationToken)
    {
        return Task.FromResult(Tokens.SingleOrDefault((tokenRecord) =>
            tokenRecord.Token == token && tokenRecord.RevokedAt is null));
    }

    public Task<AuthUserRecord?> GetUserByIdAsync(long userId, CancellationToken cancellationToken)
    {
        return Task.FromResult(Users.SingleOrDefault((userRecord) => userRecord.Id == userId));
    }

    public Task<AuthUserRecord?> GetUserByUsernameAsync(string username, CancellationToken cancellationToken)
    {
        return Task.FromResult(Users.SingleOrDefault((userRecord) => userRecord.Username == username));
    }

    public Task RevokeTokenAsync(string token, string revokedReason, CancellationToken cancellationToken)
    {
        var tokenRecord = Tokens.Single((existingTokenRecord) => existingTokenRecord.Token == token);
        var updatedTokenRecord = tokenRecord with
        {
            RevokedAt = DateTime.UtcNow,
            RevokedReason = revokedReason,
        };
        var tokenIndex = Tokens.FindIndex((existingTokenRecord) => existingTokenRecord.Id == tokenRecord.Id);

        Tokens[tokenIndex] = updatedTokenRecord;

        return Task.CompletedTask;
    }

    public AuthTokenRecord SeedToken(long userId, string token)
    {
        var tokenRecord = new AuthTokenRecord(
            Id: nextTokenId++,
            UserId: userId,
            Token: token,
            CreatedAt: DateTime.UtcNow,
            LastUsedAt: null,
            RevokedAt: null,
            RevokedReason: null,
            ClientIp: "127.0.0.1",
            UserAgent: "seed");

        Tokens.Add(tokenRecord);

        return tokenRecord;
    }

    public AuthUserRecord SeedUser(
        string username,
        string email,
        string passwordHash,
        string role = "user",
        string status = "active")
    {
        var userRecord = new AuthUserRecord(
            Id: nextUserId++,
            Username: username,
            Email: email,
            PasswordHash: passwordHash,
            Role: role,
            Status: status,
            CreatedAt: DateTime.UtcNow,
            UpdatedAt: DateTime.UtcNow);

        Users.Add(userRecord);

        return userRecord;
    }

    public Task TouchTokenAsync(string token, CancellationToken cancellationToken)
    {
        var tokenRecord = Tokens.Single((existingTokenRecord) => existingTokenRecord.Token == token);
        var updatedTokenRecord = tokenRecord with
        {
            LastUsedAt = DateTime.UtcNow,
        };
        var tokenIndex = Tokens.FindIndex((existingTokenRecord) => existingTokenRecord.Id == tokenRecord.Id);

        Tokens[tokenIndex] = updatedTokenRecord;

        return Task.CompletedTask;
    }

    public Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken)
    {
        return Task.FromResult(Users.Any((userRecord) => userRecord.Username == username));
    }
}
