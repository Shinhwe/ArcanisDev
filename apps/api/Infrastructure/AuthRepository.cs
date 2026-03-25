using MySqlConnector;

public sealed class AuthRepository : IAuthRepository
{
    private readonly LegacyCmsConnectionFactory legacyCmsConnectionFactory;

    public AuthRepository(LegacyCmsConnectionFactory legacyCmsConnectionFactory)
    {
        this.legacyCmsConnectionFactory = legacyCmsConnectionFactory;
    }

    public async Task<AuthTokenRecord> CreateTokenAsync(
        long userId,
        string token,
        string? clientIp,
        string? userAgent,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO cms_auth_tokens (user_id, token, client_ip, user_agent)
            VALUES (@userId, @token, @clientIp, @userAgent);
            """;

        await using var databaseConnection = legacyCmsConnectionFactory.CreateGameConnection();
        await databaseConnection.OpenAsync(cancellationToken);
        await using var databaseCommand = new MySqlCommand(sql, databaseConnection);

        databaseCommand.Parameters.AddWithValue("@userId", userId);
        databaseCommand.Parameters.AddWithValue("@token", token);
        databaseCommand.Parameters.AddWithValue("@clientIp", (object?)clientIp ?? DBNull.Value);
        databaseCommand.Parameters.AddWithValue("@userAgent", (object?)userAgent ?? DBNull.Value);

        await databaseCommand.ExecuteNonQueryAsync(cancellationToken);

        return new AuthTokenRecord(
            Id: databaseCommand.LastInsertedId,
            UserId: userId,
            Token: token,
            CreatedAt: DateTime.UtcNow,
            LastUsedAt: null,
            RevokedAt: null,
            RevokedReason: null,
            ClientIp: clientIp,
            UserAgent: userAgent);
    }

    public async Task<AuthUserRecord> CreateUserAsync(
        string username,
        string email,
        string passwordHash,
        string role,
        string status,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO cms_users (username, email, password_hash, role, status)
            VALUES (@username, @email, @passwordHash, @role, @status);
            """;

        await using var databaseConnection = legacyCmsConnectionFactory.CreateGameConnection();
        await databaseConnection.OpenAsync(cancellationToken);
        await using var databaseCommand = new MySqlCommand(sql, databaseConnection);

        databaseCommand.Parameters.AddWithValue("@username", username);
        databaseCommand.Parameters.AddWithValue("@email", email);
        databaseCommand.Parameters.AddWithValue("@passwordHash", passwordHash);
        databaseCommand.Parameters.AddWithValue("@role", role);
        databaseCommand.Parameters.AddWithValue("@status", status);

        await databaseCommand.ExecuteNonQueryAsync(cancellationToken);

        return new AuthUserRecord(
            Id: databaseCommand.LastInsertedId,
            Username: username,
            Email: email,
            PasswordHash: passwordHash,
            Role: role,
            Status: status,
            CreatedAt: DateTime.UtcNow,
            UpdatedAt: DateTime.UtcNow);
    }

    public async Task<bool> EmailExistsAsync(string email, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT 1
            FROM cms_users
            WHERE email = @email
            LIMIT 1;
            """;

        return await ExecuteExistsQueryAsync(sql, "@email", email, cancellationToken);
    }

    public async Task<AuthTokenRecord?> GetActiveTokenAsync(string token, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT id, user_id, token, created_at, last_used_at, revoked_at, revoked_reason, client_ip, user_agent
            FROM cms_auth_tokens
            WHERE token = @token AND revoked_at IS NULL
            LIMIT 1;
            """;

        await using var databaseConnection = legacyCmsConnectionFactory.CreateGameConnection();
        await databaseConnection.OpenAsync(cancellationToken);
        await using var databaseCommand = new MySqlCommand(sql, databaseConnection);

        databaseCommand.Parameters.AddWithValue("@token", token);

        await using var databaseReader = await databaseCommand.ExecuteReaderAsync(cancellationToken);

        if (await databaseReader.ReadAsync(cancellationToken) == false)
        {
            return null;
        }

        return MapAuthTokenRecord(databaseReader);
    }

    public async Task<AuthUserRecord?> GetUserByIdAsync(long userId, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT id, username, email, password_hash, role, status, created_at, updated_at
            FROM cms_users
            WHERE id = @userId
            LIMIT 1;
            """;

        return await GetSingleUserRecordAsync(sql, "@userId", userId, cancellationToken);
    }

    public async Task<AuthUserRecord?> GetUserByUsernameAsync(string username, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT id, username, email, password_hash, role, status, created_at, updated_at
            FROM cms_users
            WHERE username = @username
            LIMIT 1;
            """;

        return await GetSingleUserRecordAsync(sql, "@username", username, cancellationToken);
    }

    public async Task RevokeTokenAsync(string token, string revokedReason, CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE cms_auth_tokens
            SET revoked_at = UTC_TIMESTAMP(), revoked_reason = @revokedReason
            WHERE token = @token AND revoked_at IS NULL;
            """;

        await using var databaseConnection = legacyCmsConnectionFactory.CreateGameConnection();
        await databaseConnection.OpenAsync(cancellationToken);
        await using var databaseCommand = new MySqlCommand(sql, databaseConnection);

        databaseCommand.Parameters.AddWithValue("@token", token);
        databaseCommand.Parameters.AddWithValue("@revokedReason", revokedReason);

        await databaseCommand.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task TouchTokenAsync(string token, CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE cms_auth_tokens
            SET last_used_at = UTC_TIMESTAMP()
            WHERE token = @token;
            """;

        await using var databaseConnection = legacyCmsConnectionFactory.CreateGameConnection();
        await databaseConnection.OpenAsync(cancellationToken);
        await using var databaseCommand = new MySqlCommand(sql, databaseConnection);

        databaseCommand.Parameters.AddWithValue("@token", token);

        await databaseCommand.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<bool> UsernameExistsAsync(string username, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT 1
            FROM cms_users
            WHERE username = @username
            LIMIT 1;
            """;

        return await ExecuteExistsQueryAsync(sql, "@username", username, cancellationToken);
    }

    private async Task<bool> ExecuteExistsQueryAsync(
        string sql,
        string parameterName,
        object parameterValue,
        CancellationToken cancellationToken)
    {
        await using var databaseConnection = legacyCmsConnectionFactory.CreateGameConnection();
        await databaseConnection.OpenAsync(cancellationToken);
        await using var databaseCommand = new MySqlCommand(sql, databaseConnection);

        databaseCommand.Parameters.AddWithValue(parameterName, parameterValue);

        var scalarResult = await databaseCommand.ExecuteScalarAsync(cancellationToken);

        return scalarResult is not null;
    }

    private async Task<AuthUserRecord?> GetSingleUserRecordAsync(
        string sql,
        string parameterName,
        object parameterValue,
        CancellationToken cancellationToken)
    {
        await using var databaseConnection = legacyCmsConnectionFactory.CreateGameConnection();
        await databaseConnection.OpenAsync(cancellationToken);
        await using var databaseCommand = new MySqlCommand(sql, databaseConnection);

        databaseCommand.Parameters.AddWithValue(parameterName, parameterValue);

        await using var databaseReader = await databaseCommand.ExecuteReaderAsync(cancellationToken);

        if (await databaseReader.ReadAsync(cancellationToken) == false)
        {
            return null;
        }

        return MapAuthUserRecord(databaseReader);
    }

    private static AuthTokenRecord MapAuthTokenRecord(MySqlDataReader databaseReader)
    {
        return new AuthTokenRecord(
            Id: databaseReader.GetInt64("id"),
            UserId: databaseReader.GetInt64("user_id"),
            Token: databaseReader.GetString("token"),
            CreatedAt: databaseReader.GetDateTime("created_at"),
            LastUsedAt: GetNullableDateTime(databaseReader, "last_used_at"),
            RevokedAt: GetNullableDateTime(databaseReader, "revoked_at"),
            RevokedReason: GetNullableString(databaseReader, "revoked_reason"),
            ClientIp: GetNullableString(databaseReader, "client_ip"),
            UserAgent: GetNullableString(databaseReader, "user_agent"));
    }

    private static AuthUserRecord MapAuthUserRecord(MySqlDataReader databaseReader)
    {
        return new AuthUserRecord(
            Id: databaseReader.GetInt64("id"),
            Username: databaseReader.GetString("username"),
            Email: databaseReader.GetString("email"),
            PasswordHash: databaseReader.GetString("password_hash"),
            Role: databaseReader.GetString("role"),
            Status: databaseReader.GetString("status"),
            CreatedAt: databaseReader.GetDateTime("created_at"),
            UpdatedAt: databaseReader.GetDateTime("updated_at"));
    }

    private static DateTime? GetNullableDateTime(MySqlDataReader databaseReader, string columnName)
    {
        var columnIndex = databaseReader.GetOrdinal(columnName);

        if (databaseReader.IsDBNull(columnIndex))
        {
            return null;
        }

        return databaseReader.GetDateTime(columnIndex);
    }

    private static string? GetNullableString(MySqlDataReader databaseReader, string columnName)
    {
        var columnIndex = databaseReader.GetOrdinal(columnName);

        if (databaseReader.IsDBNull(columnIndex))
        {
            return null;
        }

        return databaseReader.GetString(columnIndex);
    }
}
