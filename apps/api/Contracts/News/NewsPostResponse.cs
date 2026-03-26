public sealed record NewsPostResponse(
    int Id,
    int CategoryId,
    string CategoryName,
    string Title,
    string CreatedAt,
    string IframeHtmlDocument);
