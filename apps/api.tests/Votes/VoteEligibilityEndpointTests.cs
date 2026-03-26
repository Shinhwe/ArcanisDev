using System.Net;
using System.Net.Http.Headers;
using System.Text.Json.Nodes;

public sealed class VoteEligibilityEndpointTests
{
    [Fact]
    public async Task Anonymous_request_returns_login_required_vote_eligibility()
    {
        await using var authApiFactory = new AuthApiFactory("unused-token");
        using var httpClient = authApiFactory.CreateClient();

        var response = await httpClient.GetAsync("/api/v1/votes/eligibility");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var responsePayload = JsonNode.Parse(await response.Content.ReadAsStringAsync())?.AsObject();

        Assert.Equal(false, responsePayload?["canVote"]?.GetValue<bool>());
        Assert.Equal("login_required", responsePayload?["status"]?.GetValue<string>());
        Assert.Equal("Login is required before voting.", responsePayload?["message"]?.GetValue<string>());
        Assert.Equal(false, responsePayload?["hasLinkedGameAccount"]?.GetValue<bool>());
        Assert.Equal(24, responsePayload?["voteIntervalHours"]?.GetValue<int>());
        Assert.True(responsePayload?["nextEligibleAt"] is null || responsePayload["nextEligibleAt"]!.GetValueKind() == System.Text.Json.JsonValueKind.Null);
    }

    [Fact]
    public async Task Authenticated_request_returns_link_required_vote_eligibility()
    {
        await using var authApiFactory = new AuthApiFactory("unused-token");
        var seededUser = authApiFactory.AuthRepository.SeedUser(
            username: "alpha",
            email: "alpha@example.com",
            passwordHash: CreateValidPasswordHash(),
            role: "user");

        authApiFactory.AuthRepository.SeedToken(seededUser.Id, "token-vote-eligibility");

        using var httpClient = authApiFactory.CreateClient();
        httpClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", "token-vote-eligibility");

        var response = await httpClient.GetAsync("/api/v1/votes/eligibility");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var responsePayload = JsonNode.Parse(await response.Content.ReadAsStringAsync())?.AsObject();

        Assert.Equal(false, responsePayload?["canVote"]?.GetValue<bool>());
        Assert.Equal("link_required", responsePayload?["status"]?.GetValue<string>());
        Assert.Equal("Link a game account before voting.", responsePayload?["message"]?.GetValue<string>());
        Assert.Equal(false, responsePayload?["hasLinkedGameAccount"]?.GetValue<bool>());
        Assert.Equal(24, responsePayload?["voteIntervalHours"]?.GetValue<int>());
        Assert.True(responsePayload?["nextEligibleAt"] is null || responsePayload["nextEligibleAt"]!.GetValueKind() == System.Text.Json.JsonValueKind.Null);
    }

    private static string CreateValidPasswordHash()
    {
        return string.Concat(Enumerable.Repeat("a", 128));
    }
}
