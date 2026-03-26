using MySqlConnector;

public sealed class UserSettingsRepository : IUserSettingsRepository
{
    private readonly LegacyCmsConnectionFactory legacyCmsConnectionFactory;

    public UserSettingsRepository(LegacyCmsConnectionFactory legacyCmsConnectionFactory)
    {
        this.legacyCmsConnectionFactory = legacyCmsConnectionFactory;
    }

    public async Task<UserVerificationCodeRecord> CreateVerificationCodeAsync(
        long userId,
        string operation,
        string targetValue,
        string verificationCode,
        DateTime expiresAt,
        CancellationToken cancellationToken)
    {
        const string sql = """
            INSERT INTO cms_user_verification_codes (
                user_id,
                operation,
                target_value,
                verification_code,
                expires_at)
            VALUES (
                @userId,
                @operation,
                @targetValue,
                @verificationCode,
                @expiresAt);
            """;

        await using var databaseConnection = legacyCmsConnectionFactory.CreateGameConnection();
        await databaseConnection.OpenAsync(cancellationToken);
        await using var databaseCommand = new MySqlCommand(sql, databaseConnection);

        databaseCommand.Parameters.AddWithValue("@userId", userId);
        databaseCommand.Parameters.AddWithValue("@operation", operation);
        databaseCommand.Parameters.AddWithValue("@targetValue", targetValue);
        databaseCommand.Parameters.AddWithValue("@verificationCode", verificationCode);
        databaseCommand.Parameters.AddWithValue("@expiresAt", expiresAt);

        await databaseCommand.ExecuteNonQueryAsync(cancellationToken);

        return new UserVerificationCodeRecord(
            Id: databaseCommand.LastInsertedId,
            UserId: userId,
            Operation: operation,
            TargetValue: targetValue,
            VerificationCode: verificationCode,
            CreatedAt: DateTime.UtcNow,
            ExpiresAt: expiresAt,
            ConsumedAt: null,
            InvalidatedAt: null);
    }

    public async Task ConsumeVerificationCodeAsync(long verificationCodeId, CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE cms_user_verification_codes
            SET consumed_at = UTC_TIMESTAMP()
            WHERE id = @verificationCodeId AND consumed_at IS NULL;
            """;

        await using var databaseConnection = legacyCmsConnectionFactory.CreateGameConnection();
        await databaseConnection.OpenAsync(cancellationToken);
        await using var databaseCommand = new MySqlCommand(sql, databaseConnection);

        databaseCommand.Parameters.AddWithValue("@verificationCodeId", verificationCodeId);

        await databaseCommand.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task<UserVerificationCodeRecord?> GetPendingVerificationCodeAsync(
        long userId,
        string operation,
        string targetValue,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT id, user_id, operation, target_value, verification_code, created_at, expires_at, consumed_at, invalidated_at
            FROM cms_user_verification_codes
            WHERE user_id = @userId
              AND operation = @operation
              AND target_value = @targetValue
              AND consumed_at IS NULL
              AND invalidated_at IS NULL
            ORDER BY id DESC
            LIMIT 1;
            """;

        await using var databaseConnection = legacyCmsConnectionFactory.CreateGameConnection();
        await databaseConnection.OpenAsync(cancellationToken);
        await using var databaseCommand = new MySqlCommand(sql, databaseConnection);

        databaseCommand.Parameters.AddWithValue("@userId", userId);
        databaseCommand.Parameters.AddWithValue("@operation", operation);
        databaseCommand.Parameters.AddWithValue("@targetValue", targetValue);

        await using var databaseReader = await databaseCommand.ExecuteReaderAsync(cancellationToken);

        if (await databaseReader.ReadAsync(cancellationToken) == false)
        {
            return null;
        }

        return new UserVerificationCodeRecord(
            Id: databaseReader.GetInt64("id"),
            UserId: databaseReader.GetInt64("user_id"),
            Operation: databaseReader.GetString("operation"),
            TargetValue: databaseReader.GetString("target_value"),
            VerificationCode: databaseReader.GetString("verification_code"),
            CreatedAt: databaseReader.GetDateTime("created_at"),
            ExpiresAt: databaseReader.GetDateTime("expires_at"),
            ConsumedAt: GetNullableDateTime(databaseReader, "consumed_at"),
            InvalidatedAt: GetNullableDateTime(databaseReader, "invalidated_at"));
    }

    public async Task InvalidatePendingVerificationCodesAsync(
        long userId,
        string operation,
        string preservedTargetValue,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE cms_user_verification_codes
            SET invalidated_at = UTC_TIMESTAMP()
            WHERE user_id = @userId
              AND operation = @operation
              AND target_value <> @preservedTargetValue
              AND consumed_at IS NULL
              AND invalidated_at IS NULL;
            """;

        await using var databaseConnection = legacyCmsConnectionFactory.CreateGameConnection();
        await databaseConnection.OpenAsync(cancellationToken);
        await using var databaseCommand = new MySqlCommand(sql, databaseConnection);

        databaseCommand.Parameters.AddWithValue("@userId", userId);
        databaseCommand.Parameters.AddWithValue("@operation", operation);
        databaseCommand.Parameters.AddWithValue("@preservedTargetValue", preservedTargetValue);

        await databaseCommand.ExecuteNonQueryAsync(cancellationToken);
    }

    public async Task UpdateUserEmailAsync(long userId, string email, CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE cms_users
            SET email = @email
            WHERE id = @userId;
            """;

        await ExecuteUserUpdateAsync(sql, userId, "@email", email, cancellationToken);
    }

    public async Task UpdateUserPasswordHashAsync(
        long userId,
        string passwordHash,
        CancellationToken cancellationToken)
    {
        const string sql = """
            UPDATE cms_users
            SET password_hash = @passwordHash
            WHERE id = @userId;
            """;

        await ExecuteUserUpdateAsync(sql, userId, "@passwordHash", passwordHash, cancellationToken);
    }

    private async Task ExecuteUserUpdateAsync(
        string sql,
        long userId,
        string parameterName,
        string parameterValue,
        CancellationToken cancellationToken)
    {
        await using var databaseConnection = legacyCmsConnectionFactory.CreateGameConnection();
        await databaseConnection.OpenAsync(cancellationToken);
        await using var databaseCommand = new MySqlCommand(sql, databaseConnection);

        databaseCommand.Parameters.AddWithValue("@userId", userId);
        databaseCommand.Parameters.AddWithValue(parameterName, parameterValue);

        await databaseCommand.ExecuteNonQueryAsync(cancellationToken);
    }

    private static DateTime? GetNullableDateTime(MySqlDataReader databaseReader, string columnName)
    {
        var columnIndex = databaseReader.GetOrdinal(columnName);

        return databaseReader.IsDBNull(columnIndex) ? null : databaseReader.GetDateTime(columnIndex);
    }
}
