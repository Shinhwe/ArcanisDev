using System.Net;
using System.Net.Http.Headers;
using System.Text.Json.Nodes;

public sealed class UserProfileEndpointTests
{
    [Fact]
    public async Task Current_user_profile_returns_auth_user_and_unavailable_game_account_summary()
    {
        await using var authApiFactory = new AuthApiFactory("unused-token");
        var seededUser = authApiFactory.AuthRepository.SeedUser(
            username: "alpha",
            email: "alpha@example.com",
            passwordHash: CreateValidPasswordHash(),
            role: "user");

        authApiFactory.AuthRepository.SeedToken(seededUser.Id, "token-user-profile");

        using var httpClient = authApiFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "token-user-profile");

        var response = await httpClient.GetAsync("/api/v1/users/me/profile");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var responsePayload = JsonNode.Parse(await response.Content.ReadAsStringAsync())?.AsObject();

        Assert.Equal("alpha", responsePayload?["user"]?["username"]?.GetValue<string>());
        Assert.Equal("alpha@example.com", responsePayload?["user"]?["email"]?.GetValue<string>());
        Assert.Null(responsePayload?["gameAccount"]?["votePoints"]);
        Assert.Null(responsePayload?["gameAccount"]?["donationPoints"]);
        Assert.Null(responsePayload?["gameAccount"]?["maplePoints"]);
        Assert.Null(responsePayload?["gameAccount"]?["nxPrepaid"]);
        Assert.Equal(false, responsePayload?["gameAccount"]?["isLinked"]?.GetValue<bool>());
    }

    [Fact]
    public async Task Current_user_profile_ignores_legacy_game_account_records_until_explicit_linking_exists()
    {
        await using var authApiFactory = new AuthApiFactory("unused-token");
        var seededUser = authApiFactory.AuthRepository.SeedUser(
            username: "alpha",
            email: "alpha@example.com",
            passwordHash: CreateValidPasswordHash(),
            role: "user");

        authApiFactory.AuthRepository.SeedToken(seededUser.Id, "token-user-profile-linked");
        authApiFactory.UserProfileRepository.SeedGameAccount(
            username: "alpha",
            votePoints: 25,
            donationPoints: 50,
            maplePoints: 75,
            nxPrepaid: 100);

        using var httpClient = authApiFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "token-user-profile-linked");

        var response = await httpClient.GetAsync("/api/v1/users/me/profile");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var responsePayload = JsonNode.Parse(await response.Content.ReadAsStringAsync())?.AsObject();

        Assert.Null(responsePayload?["gameAccount"]?["votePoints"]);
        Assert.Null(responsePayload?["gameAccount"]?["donationPoints"]);
        Assert.Null(responsePayload?["gameAccount"]?["maplePoints"]);
        Assert.Null(responsePayload?["gameAccount"]?["nxPrepaid"]);
        Assert.Equal(false, responsePayload?["gameAccount"]?["isLinked"]?.GetValue<bool>());
    }

    [Fact]
    public async Task Current_user_profile_returns_empty_unauthorized_for_invalid_token()
    {
        await using var authApiFactory = new AuthApiFactory("unused-token");
        using var httpClient = authApiFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "invalid-token");

        var response = await httpClient.GetAsync("/api/v1/users/me/profile");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        Assert.Equal(string.Empty, await response.Content.ReadAsStringAsync());
    }

    private static string CreateValidPasswordHash()
    {
        return string.Concat(Enumerable.Repeat("a", 128));
    }
}
