using System.Net;
using System.Text.Json.Nodes;

public sealed class ClientDownloadEndpointTests
{
    [Fact]
    public async Task Client_download_returns_all_available_mirrors()
    {
        await using var authApiFactory = new AuthApiFactory("unused-token");
        authApiFactory.DownloadRepository.SetMirrorUrls(
            megaUrl: "https://mega.example/client",
            driveUrl: "https://drive.example/client");

        using var httpClient = authApiFactory.CreateClient();

        var response = await httpClient.GetAsync("/api/v1/downloads/client");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var responsePayload = JsonNode.Parse(await response.Content.ReadAsStringAsync())?.AsObject();
        var mirrors = responsePayload?["mirrors"]?.AsArray();

        Assert.Equal(2, mirrors?.Count);
        Assert.Equal("mega", mirrors?[0]?["id"]?.GetValue<string>());
        Assert.Equal("Mirror 1 (Mega)", mirrors?[0]?["label"]?.GetValue<string>());
        Assert.Equal("https://mega.example/client", mirrors?[0]?["url"]?.GetValue<string>());
        Assert.Equal("google-drive", mirrors?[1]?["id"]?.GetValue<string>());
        Assert.Equal("Mirror 2 (Google Drive)", mirrors?[1]?["label"]?.GetValue<string>());
        Assert.Equal("https://drive.example/client", mirrors?[1]?["url"]?.GetValue<string>());
    }

    [Fact]
    public async Task Client_download_filters_blank_mirror_urls()
    {
        await using var authApiFactory = new AuthApiFactory("unused-token");
        authApiFactory.DownloadRepository.SetMirrorUrls(
            megaUrl: "https://mega.example/client",
            driveUrl: " ");

        using var httpClient = authApiFactory.CreateClient();

        var response = await httpClient.GetAsync("/api/v1/downloads/client");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var responsePayload = JsonNode.Parse(await response.Content.ReadAsStringAsync())?.AsObject();
        var mirrors = responsePayload?["mirrors"]?.AsArray();

        Assert.Equal(1, mirrors?.Count);
        Assert.Equal("mega", mirrors?[0]?["id"]?.GetValue<string>());
    }

    [Fact]
    public async Task Client_download_returns_an_empty_list_when_all_mirrors_are_blank()
    {
        await using var authApiFactory = new AuthApiFactory("unused-token");
        authApiFactory.DownloadRepository.SetMirrorUrls(
            megaUrl: string.Empty,
            driveUrl: string.Empty);

        using var httpClient = authApiFactory.CreateClient();

        var response = await httpClient.GetAsync("/api/v1/downloads/client");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        var responsePayload = JsonNode.Parse(await response.Content.ReadAsStringAsync())?.AsObject();
        var mirrors = responsePayload?["mirrors"]?.AsArray();

        Assert.NotNull(mirrors);
        Assert.Empty(mirrors);
    }

    [Fact]
    public async Task Client_download_returns_not_found_when_the_download_config_row_is_missing()
    {
        await using var authApiFactory = new AuthApiFactory("unused-token");
        authApiFactory.DownloadRepository.RemoveConfigRow();

        using var httpClient = authApiFactory.CreateClient();

        var response = await httpClient.GetAsync("/api/v1/downloads/client");

        Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
    }
}
