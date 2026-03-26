using MySqlConnector;

public sealed class DownloadRepository : IDownloadRepository
{
    private readonly LegacyCmsConnectionFactory legacyCmsConnectionFactory;

    public DownloadRepository(LegacyCmsConnectionFactory legacyCmsConnectionFactory)
    {
        this.legacyCmsConnectionFactory = legacyCmsConnectionFactory;
    }

    public async Task<DownloadMirrorsRecord?> GetClientDownloadMirrorsAsync(
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT mega_mirror, drive_mirror
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
            return null;
        }

        return new DownloadMirrorsRecord(
            DriveMirrorUrl: GetNullableString(databaseReader, "drive_mirror"),
            MegaMirrorUrl: GetNullableString(databaseReader, "mega_mirror"));
    }

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
