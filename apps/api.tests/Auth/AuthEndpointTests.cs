using System.Net;
using System.Net.Http.Json;

public sealed class AuthEndpointTests
{
    [Fact]
    public async Task Register_returns_token_and_user_payload()
    {
        await using var authApiFactory = new AuthApiFactory("token-register-endpoint");
        using var httpClient = authApiFactory.CreateClient();

        var response = await httpClient.PostAsJsonAsync("/api/v1/auth/register", new
        {
            username = "alpha",
            email = "alpha@example.com",
            passwordHash = CreateValidPasswordHash(),
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var responseData = await response.Content.ReadFromJsonAsync<AuthSessionResponse>();

        Assert.NotNull(responseData);
        Assert.Equal("token-register-endpoint", responseData.Token);
        Assert.Equal("alpha", responseData.User.Username);
    }

    [Fact]
    public async Task Login_returns_token_and_user_payload()
    {
        await using var authApiFactory = new AuthApiFactory("token-login-endpoint");
        authApiFactory.AuthRepository.SeedUser(
            username: "alpha",
            email: "alpha@example.com",
            passwordHash: CreateValidPasswordHash());

        using var httpClient = authApiFactory.CreateClient();
        var response = await httpClient.PostAsJsonAsync("/api/v1/auth/login", new
        {
            username = "alpha",
            passwordHash = CreateValidPasswordHash(),
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var responseData = await response.Content.ReadFromJsonAsync<AuthSessionResponse>();

        Assert.NotNull(responseData);
        Assert.Equal("token-login-endpoint", responseData.Token);
        Assert.Equal("alpha", responseData.User.Username);
    }

    [Fact]
    public async Task Login_returns_a_generic_error_message_for_invalid_credentials()
    {
        await using var authApiFactory = new AuthApiFactory("unused-token");
        using var httpClient = authApiFactory.CreateClient();

        var response = await httpClient.PostAsJsonAsync("/api/v1/auth/login", new
        {
            username = "missing-user",
            passwordHash = CreateValidPasswordHash(),
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        var responseData = await response.Content.ReadFromJsonAsync<ApiErrorResponse>();

        Assert.NotNull(responseData);
        Assert.Equal("Invalid username or password.", responseData.Message);
    }

    [Fact]
    public async Task Me_returns_the_current_user_for_an_authenticated_request()
    {
        await using var authApiFactory = new AuthApiFactory("unused-token");
        var seededUser = authApiFactory.AuthRepository.SeedUser(
            username: "alpha",
            email: "alpha@example.com",
            passwordHash: CreateValidPasswordHash(),
            role: "admin");

        authApiFactory.AuthRepository.SeedToken(seededUser.Id, "token-me-endpoint");

        using var httpClient = authApiFactory.CreateClient();

        httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "token-me-endpoint");

        var response = await httpClient.GetAsync("/api/v1/auth/me");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var responseData = await response.Content.ReadFromJsonAsync<CurrentUserResponse>();

        Assert.NotNull(responseData);
        Assert.Equal("alpha", responseData.User.Username);
        Assert.Equal("admin", responseData.User.Role);
    }

    [Fact]
    public async Task Me_returns_empty_unauthorized_for_an_invalid_token()
    {
        await using var authApiFactory = new AuthApiFactory("unused-token");
        using var httpClient = authApiFactory.CreateClient();

        httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "invalid-token");

        var response = await httpClient.GetAsync("/api/v1/auth/me");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(string.Empty, await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Logout_revokes_the_current_token()
    {
        await using var authApiFactory = new AuthApiFactory("unused-token");
        var seededUser = authApiFactory.AuthRepository.SeedUser(
            username: "alpha",
            email: "alpha@example.com",
            passwordHash: CreateValidPasswordHash());

        authApiFactory.AuthRepository.SeedToken(seededUser.Id, "token-logout-endpoint");

        using var httpClient = authApiFactory.CreateClient();

        httpClient.DefaultRequestHeaders.Authorization =
            new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", "token-logout-endpoint");

        var response = await httpClient.PostAsync("/api/v1/auth/logout", content: null);

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        Assert.NotNull(authApiFactory.AuthRepository.Tokens.Single((tokenRecord) =>
            tokenRecord.Token == "token-logout-endpoint").RevokedAt);
    }

    private static string CreateValidPasswordHash()
    {
        return string.Concat(Enumerable.Repeat("a", 128));
    }
}
