using MySqlConnector;

public static class ConfigEndpoints
{
    public static IEndpointRouteBuilder MapConfigEndpoints(this IEndpointRouteBuilder endpointRouteBuilder)
    {
        endpointRouteBuilder.MapGet("/api/v1/config", HandleGetSiteConfig)
        .WithName("GetSiteConfig");

        return endpointRouteBuilder;
    }

    private static async Task<IResult> HandleGetSiteConfig(
        LegacyCmsConnectionFactory legacyCmsConnectionFactory,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT youtube_link, discord_link
            FROM web_general
            ORDER BY id
            LIMIT 1;
            """;

        await using var databaseConnection = legacyCmsConnectionFactory.CreateGameConnection();
        await databaseConnection.OpenAsync(cancellationToken);
        await using var databaseCommand = new MySqlCommand(sql, databaseConnection);
        await using var databaseReader = await databaseCommand.ExecuteReaderAsync(cancellationToken);

        if (await databaseReader.ReadAsync(cancellationToken) == false)
        {
            return TypedResults.NotFound();
        }

        var responseData = new ConfigResponse(
            DiscordLink: GetNullableString(databaseReader, "discord_link"),
            YoutubeLink: GetNullableString(databaseReader, "youtube_link"));

        return TypedResults.Ok(responseData);
    }

    private sealed record ConfigResponse(
        string DiscordLink,
        string YoutubeLink);

    private static string GetNullableString(MySqlDataReader databaseReader, string columnName)
    {
        var columnIndex = databaseReader.GetOrdinal(columnName);

        if (databaseReader.IsDBNull(columnIndex))
        {
            return string.Empty;
        }

        return databaseReader.GetString(columnIndex);
    }
}
