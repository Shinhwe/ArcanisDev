using Microsoft.Extensions.Options;
using MySqlConnector;

public sealed class LegacyCmsConnectionFactory
{
    private readonly DatabaseOptions databaseOptions;

    public LegacyCmsConnectionFactory(IOptions<DatabaseOptions> databaseOptionsAccessor)
    {
        databaseOptions = databaseOptionsAccessor.Value;
    }

    public MySqlConnection CreateGameConnection()
    {
        var connectionStringBuilder = new MySqlConnectionStringBuilder
        {
            CharacterSet = "utf8mb4",
            Database = databaseOptions.DatabaseName,
            Password = databaseOptions.Password,
            Port = (uint)databaseOptions.Port,
            Server = databaseOptions.Host,
            UserID = databaseOptions.Username,
        };

        return new MySqlConnection(connectionStringBuilder.ConnectionString);
    }
}
