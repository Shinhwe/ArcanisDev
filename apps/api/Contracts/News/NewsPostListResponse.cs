public sealed record NewsPostListResponse(
    IReadOnlyList<NewsPostListItemResponse> Items,
    string? NextCursor);
