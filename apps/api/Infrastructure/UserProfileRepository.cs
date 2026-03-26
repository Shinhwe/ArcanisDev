using MySqlConnector;

public sealed class UserProfileRepository : IUserProfileRepository
{
    private readonly LegacyCmsConnectionFactory legacyCmsConnectionFactory;

    public UserProfileRepository(LegacyCmsConnectionFactory legacyCmsConnectionFactory)
    {
        this.legacyCmsConnectionFactory = legacyCmsConnectionFactory;
    }

    public async Task<UserGameAccountRecord?> GetGameAccountByUsernameAsync(
        string username,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT votepoints, donationpoints, maplePoints, nxPrepaid
            FROM users
            WHERE name = @username
            LIMIT 1;
            """;

        await using var databaseConnection = legacyCmsConnectionFactory.CreateGameConnection();
        await databaseConnection.OpenAsync(cancellationToken);
        await using var databaseCommand = new MySqlCommand(sql, databaseConnection);

        databaseCommand.Parameters.AddWithValue("@username", username);

        await using var databaseReader = await databaseCommand.ExecuteReaderAsync(cancellationToken);

        if (await databaseReader.ReadAsync(cancellationToken) == false)
        {
            return null;
        }

        return new UserGameAccountRecord(
            DonationPoints: databaseReader.GetInt32("donationpoints"),
            MaplePoints: databaseReader.GetInt32("maplePoints"),
            NxPrepaid: databaseReader.GetInt32("nxPrepaid"),
            VotePoints: databaseReader.GetInt32("votepoints"));
    }
}
