public sealed record NewsCategoryRecord(
    int Id,
    string Name);

public sealed record NewsPostCursorRecord(
    DateTimeOffset CreatedAtUtc,
    int PostId);

public sealed record NewsPostListItemRecord(
    int Id,
    int CategoryId,
    string Title,
    DateTimeOffset CreatedAtUtc);

public sealed record NewsPostListPageRecord(
    IReadOnlyList<NewsPostListItemRecord> Items,
    NewsPostCursorRecord? NextCursor);

public sealed record NewsPostDetailRecord(
    int Id,
    int CategoryId,
    string CategoryName,
    string Title,
    string RawContent,
    DateTimeOffset CreatedAtUtc);
