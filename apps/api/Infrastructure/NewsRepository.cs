using MySqlConnector;

public sealed class NewsRepository : INewsRepository
{
    private readonly LegacyCmsConnectionFactory legacyCmsConnectionFactory;

    public NewsRepository(LegacyCmsConnectionFactory legacyCmsConnectionFactory)
    {
        this.legacyCmsConnectionFactory = legacyCmsConnectionFactory;
    }

    public async Task<IReadOnlyList<NewsCategoryRecord>> GetCategoriesAsync(CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT id, name
            FROM categories
            ORDER BY id ASC;
            """;

        await using var databaseConnection = legacyCmsConnectionFactory.CreateGameConnection();
        await databaseConnection.OpenAsync(cancellationToken);
        await SetSessionTimeZoneAsync(databaseConnection, cancellationToken);
        await using var databaseCommand = new MySqlCommand(sql, databaseConnection);
        await using var databaseReader = await databaseCommand.ExecuteReaderAsync(cancellationToken);

        var categoryRecords = new List<NewsCategoryRecord>();

        while (await databaseReader.ReadAsync(cancellationToken))
        {
            categoryRecords.Add(
                new NewsCategoryRecord(
                    Id: databaseReader.GetInt32("id"),
                    Name: databaseReader.GetString("name")));
        }

        return categoryRecords;
    }

    public async Task<NewsPostDetailRecord?> GetPostByIdAsync(int postId, CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                posts.id,
                posts.category_id,
                categories.name AS category_name,
                posts.title,
                posts.content,
                posts.created_at
            FROM posts
            INNER JOIN categories
                ON categories.id = posts.category_id
            WHERE posts.id = @postId
                AND posts.created_at IS NOT NULL
            LIMIT 1;
            """;

        await using var databaseConnection = legacyCmsConnectionFactory.CreateGameConnection();
        await databaseConnection.OpenAsync(cancellationToken);
        await SetSessionTimeZoneAsync(databaseConnection, cancellationToken);
        await using var databaseCommand = new MySqlCommand(sql, databaseConnection);

        databaseCommand.Parameters.AddWithValue("@postId", postId);

        await using var databaseReader = await databaseCommand.ExecuteReaderAsync(cancellationToken);

        if (await databaseReader.ReadAsync(cancellationToken) == false)
        {
            return null;
        }

        return new NewsPostDetailRecord(
            Id: databaseReader.GetInt32("id"),
            CategoryId: databaseReader.GetInt32("category_id"),
            CategoryName: databaseReader.GetString("category_name"),
            Title: databaseReader.GetString("title"),
            RawContent: databaseReader.GetString("content"),
            CreatedAtUtc: GetUtcDateTimeOffset(databaseReader, "created_at"));
    }

    public async Task<NewsPostListPageRecord> GetPostsAsync(
        int categoryId,
        int pageSize,
        NewsPostCursorRecord? cursor,
        CancellationToken cancellationToken)
    {
        const string sql = """
            SELECT
                posts.id,
                posts.category_id,
                posts.title,
                posts.created_at
            FROM posts
            WHERE posts.category_id = @categoryId
                AND posts.created_at IS NOT NULL
                AND (
                    @cursorCreatedAtUtc IS NULL
                    OR posts.created_at < @cursorCreatedAtUtc
                    OR (posts.created_at = @cursorCreatedAtUtc AND posts.id < @cursorPostId)
                )
            ORDER BY posts.created_at DESC, posts.id DESC
            LIMIT @pageSize;
            """;

        await using var databaseConnection = legacyCmsConnectionFactory.CreateGameConnection();
        await databaseConnection.OpenAsync(cancellationToken);
        await SetSessionTimeZoneAsync(databaseConnection, cancellationToken);
        await using var databaseCommand = new MySqlCommand(sql, databaseConnection);

        databaseCommand.Parameters.AddWithValue("@categoryId", categoryId);
        databaseCommand.Parameters.AddWithValue("@pageSize", pageSize);
        databaseCommand.Parameters.AddWithValue(
            "@cursorCreatedAtUtc",
            cursor is null ? DBNull.Value : cursor.CreatedAtUtc.UtcDateTime);
        databaseCommand.Parameters.AddWithValue(
            "@cursorPostId",
            cursor is null ? DBNull.Value : cursor.PostId);

        await using var databaseReader = await databaseCommand.ExecuteReaderAsync(cancellationToken);

        var postListItemRecords = new List<NewsPostListItemRecord>();

        while (await databaseReader.ReadAsync(cancellationToken))
        {
            postListItemRecords.Add(
                new NewsPostListItemRecord(
                    Id: databaseReader.GetInt32("id"),
                    CategoryId: databaseReader.GetInt32("category_id"),
                    Title: databaseReader.GetString("title"),
                    CreatedAtUtc: GetUtcDateTimeOffset(databaseReader, "created_at")));
        }

        var nextCursor = postListItemRecords.Count == 0
            ? null
            : new NewsPostCursorRecord(
                CreatedAtUtc: postListItemRecords[^1].CreatedAtUtc,
                PostId: postListItemRecords[^1].Id);

        return new NewsPostListPageRecord(
            Items: postListItemRecords,
            NextCursor: nextCursor);
    }

    private static DateTimeOffset GetUtcDateTimeOffset(MySqlDataReader databaseReader, string columnName)
    {
        var createdAtValue = databaseReader.GetDateTime(columnName);
        var utcDateTime = DateTime.SpecifyKind(createdAtValue, DateTimeKind.Utc);

        return new DateTimeOffset(utcDateTime);
    }

    private static async Task SetSessionTimeZoneAsync(
        MySqlConnection databaseConnection,
        CancellationToken cancellationToken)
    {
        await using var databaseCommand = new MySqlCommand("SET time_zone = '+00:00';", databaseConnection);
        await databaseCommand.ExecuteNonQueryAsync(cancellationToken);
    }
}
