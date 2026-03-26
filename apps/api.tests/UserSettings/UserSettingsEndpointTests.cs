using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json.Nodes;

public sealed class UserSettingsEndpointTests
{
    [Fact]
    public async Task Send_email_verification_code_returns_unauthorized_for_an_unauthenticated_request()
    {
        await using var authApiFactory = new AuthApiFactory("unused-token");
        using var httpClient = authApiFactory.CreateClient();

        var response = await httpClient.PostAsJsonAsync("/api/v1/users/me/email-verification-codes", new
        {
            currentPasswordHash = CreateValidPasswordHash(),
            newEmail = "updated@example.com",
        });

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(string.Empty, await response.Content.ReadAsStringAsync());
    }

    [Fact]
    public async Task Send_email_verification_code_returns_the_preview_code_for_the_temporary_delivery_flow()
    {
        await using var authApiFactory = new AuthApiFactory("unused-token");
        var seededUser = authApiFactory.AuthRepository.SeedUser(
            username: "alpha",
            email: "alpha@example.com",
            passwordHash: CreateValidPasswordHash());

        authApiFactory.AuthRepository.SeedToken(seededUser.Id, "token-send-code");

        using var httpClient = authApiFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "token-send-code");

        var response = await httpClient.PostAsJsonAsync("/api/v1/users/me/email-verification-codes", new
        {
            currentPasswordHash = CreateValidPasswordHash(),
            newEmail = "updated@example.com",
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var responsePayload = JsonNode.Parse(await response.Content.ReadAsStringAsync())?.AsObject();

        Assert.Equal("Verification code generated.", responsePayload?["message"]?.GetValue<string>());
        Assert.Equal(6, responsePayload?["verificationCodePreview"]?.GetValue<string>().Length);
    }

    [Fact]
    public async Task Change_email_updates_the_current_user_email()
    {
        await using var authApiFactory = new AuthApiFactory("unused-token");
        var seededUser = authApiFactory.AuthRepository.SeedUser(
            username: "alpha",
            email: "alpha@example.com",
            passwordHash: CreateValidPasswordHash());

        authApiFactory.AuthRepository.SeedToken(seededUser.Id, "token-change-email");

        using var httpClient = authApiFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "token-change-email");

        var sendCodeResponse = await httpClient.PostAsJsonAsync("/api/v1/users/me/email-verification-codes", new
        {
            currentPasswordHash = CreateValidPasswordHash(),
            newEmail = "updated@example.com",
        });

        var sendCodePayload = JsonNode.Parse(await sendCodeResponse.Content.ReadAsStringAsync())?.AsObject();
        var verificationCode = sendCodePayload?["verificationCodePreview"]?.GetValue<string>();

        var response = await httpClient.PutAsJsonAsync("/api/v1/users/me/email", new
        {
            currentPasswordHash = CreateValidPasswordHash(),
            newEmail = "updated@example.com",
            verificationCode,
        });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal(
            "updated@example.com",
            authApiFactory.AuthRepository.Users.Single((userRecord) => userRecord.Id == seededUser.Id).Email);
    }

    [Fact]
    public async Task Change_password_revokes_all_existing_tokens_for_the_user()
    {
        await using var authApiFactory = new AuthApiFactory("unused-token");
        var seededUser = authApiFactory.AuthRepository.SeedUser(
            username: "alpha",
            email: "alpha@example.com",
            passwordHash: CreateValidPasswordHash());

        authApiFactory.AuthRepository.SeedToken(seededUser.Id, "token-password-a");
        authApiFactory.AuthRepository.SeedToken(seededUser.Id, "token-password-b");

        using var httpClient = authApiFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "token-password-a");

        var response = await httpClient.PutAsJsonAsync("/api/v1/users/me/password", new
        {
            currentPasswordHash = CreateValidPasswordHash(),
            newPasswordHash = CreateDifferentPasswordHash(),
        });

        Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);

        var meRequest = new HttpRequestMessage(HttpMethod.Get, "/api/v1/auth/me");
        meRequest.Headers.Authorization = new AuthenticationHeaderValue("Bearer", "token-password-a");

        var meResponse = await httpClient.SendAsync(meRequest);

        Assert.Equal(HttpStatusCode.Unauthorized, meResponse.StatusCode);
        Assert.NotNull(authApiFactory.AuthRepository.Tokens.Single((tokenRecord) =>
            tokenRecord.Token == "token-password-b").RevokedAt);
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
