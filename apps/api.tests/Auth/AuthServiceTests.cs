public sealed class AuthServiceTests
{
    [Fact]
    public async Task RegisterAsync_creates_user_and_returns_token()
    {
        var authRepository = new InMemoryAuthRepository();
        var authTokenFactory = new FakeAuthTokenFactory("token-register-1");
        var authService = new AuthService(authRepository, authTokenFactory);

        var result = await authService.RegisterAsync(
            new RegisterRequest(
                Username: "alpha",
                Email: "alpha@example.com",
                PasswordHash: CreateValidPasswordHash()),
            new AuthClientMetadata(
                ClientIp: "127.0.0.1",
                UserAgent: "xunit"),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Equal("token-register-1", result.Data.Token);
        Assert.Equal("alpha", result.Data.User.Username);
        Assert.Equal("alpha@example.com", result.Data.User.Email);
        Assert.Single(authRepository.Users);
        Assert.Single(authRepository.Tokens);
    }

    [Fact]
    public async Task LoginAsync_returns_invalid_credentials_when_password_hash_does_not_match()
    {
        var authRepository = new InMemoryAuthRepository();
        var authTokenFactory = new FakeAuthTokenFactory("token-login-1");

        authRepository.SeedUser(
            username: "alpha",
            email: "alpha@example.com",
            passwordHash: CreateValidPasswordHash());

        var authService = new AuthService(authRepository, authTokenFactory);
        var result = await authService.LoginAsync(
            new LoginRequest(
                Username: "alpha",
                PasswordHash: CreateDifferentPasswordHash()),
            new AuthClientMetadata(
                ClientIp: "127.0.0.1",
                UserAgent: "xunit"),
            CancellationToken.None);

        Assert.False(result.IsSuccess);
        Assert.NotNull(result.Error);
        Assert.Equal(401, result.Error.StatusCode);
        Assert.Equal("auth.invalid_credentials", result.Error.Code);
    }

    [Fact]
    public async Task LogoutAsync_revokes_only_the_current_token()
    {
        var authRepository = new InMemoryAuthRepository();
        var authTokenFactory = new FakeAuthTokenFactory("unused-token");
        var seededUser = authRepository.SeedUser(
            username: "alpha",
            email: "alpha@example.com",
            passwordHash: CreateValidPasswordHash());

        authRepository.SeedToken(seededUser.Id, "token-a");
        authRepository.SeedToken(seededUser.Id, "token-b");

        var authService = new AuthService(authRepository, authTokenFactory);
        var result = await authService.LogoutAsync("token-a", CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(authRepository.Tokens.Single((tokenRecord) => tokenRecord.Token == "token-a").RevokedAt);
        Assert.Null(authRepository.Tokens.Single((tokenRecord) => tokenRecord.Token == "token-b").RevokedAt);
    }

    [Fact]
    public async Task GetCurrentUserAsync_returns_the_current_user_for_an_active_token()
    {
        var authRepository = new InMemoryAuthRepository();
        var authTokenFactory = new FakeAuthTokenFactory("unused-token");
        var seededUser = authRepository.SeedUser(
            username: "alpha",
            email: "alpha@example.com",
            passwordHash: CreateValidPasswordHash(),
            role: "admin");

        authRepository.SeedToken(seededUser.Id, "token-me");

        var authService = new AuthService(authRepository, authTokenFactory);
        var result = await authService.GetCurrentUserAsync("token-me", CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.NotNull(result.Data);
        Assert.Equal("alpha", result.Data.User.Username);
        Assert.Equal("admin", result.Data.User.Role);
    }

    private static string CreateDifferentPasswordHash()
    {
        return string.Concat(Enumerable.Repeat("b", 128));
    }

    private static string CreateValidPasswordHash()
    {
        return string.Concat(Enumerable.Repeat("a", 128));
    }
}
