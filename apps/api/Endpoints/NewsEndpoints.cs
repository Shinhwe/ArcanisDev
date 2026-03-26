using System.Globalization;

public static class NewsEndpoints
{
    private const string TimestampFormat = "yyyy-MM-dd'T'HH:mm:ss.fffffff'Z'";
    private const int DefaultPageSize = 13;
    private const int MaxPageSize = 50;

    public static IEndpointRouteBuilder MapNewsEndpoints(this IEndpointRouteBuilder endpointRouteBuilder)
    {
        endpointRouteBuilder.MapGet("/api/v1/news/categories", HandleGetCategoriesAsync)
            .WithName("GetNewsCategories");

        endpointRouteBuilder.MapGet("/api/v1/news/posts", HandleGetPostsAsync)
            .WithName("GetNewsPosts");

        endpointRouteBuilder.MapGet("/api/v1/news/posts/{postId:int}", HandleGetPostDetailAsync)
            .WithName("GetNewsPostDetail");

        return endpointRouteBuilder;
    }

    private static async Task<IResult> HandleGetCategoriesAsync(
        INewsRepository newsRepository,
        CancellationToken cancellationToken)
    {
        var categoryRecords = await newsRepository.GetCategoriesAsync(cancellationToken);
        var categories = categoryRecords
            .Select((categoryRecord) =>
            {
                return new NewsCategoryResponse(
                    Id: categoryRecord.Id,
                    Name: categoryRecord.Name);
            })
            .ToArray();

        return TypedResults.Ok(new NewsCategoryListResponse(Categories: categories));
    }

    private static async Task<IResult> HandleGetPostDetailAsync(
        int postId,
        INewsRepository newsRepository,
        INewsHtmlDocumentBuilder newsHtmlDocumentBuilder,
        CancellationToken cancellationToken)
    {
        var newsPostDetailRecord = await newsRepository.GetPostByIdAsync(postId, cancellationToken);

        if (newsPostDetailRecord is null)
        {
            return TypedResults.NotFound();
        }

        return TypedResults.Ok(
            new NewsPostDetailResponse(
                Post: new NewsPostResponse(
                    Id: newsPostDetailRecord.Id,
                    CategoryId: newsPostDetailRecord.CategoryId,
                    CategoryName: newsPostDetailRecord.CategoryName,
                    Title: newsPostDetailRecord.Title,
                    CreatedAt: FormatTimestamp(newsPostDetailRecord.CreatedAtUtc),
                    IframeHtmlDocument: newsHtmlDocumentBuilder.BuildArticleIframeHtmlDocument(
                        newsPostDetailRecord.RawContent))));
    }

    private static async Task<IResult> HandleGetPostsAsync(
        HttpContext httpContext,
        INewsRepository newsRepository,
        CancellationToken cancellationToken)
    {
        var categoryIdResult = TryParsePositiveInteger(httpContext.Request.Query["categoryId"].ToString());

        if (categoryIdResult.IsSuccess == false || categoryIdResult.Value is null)
        {
            return CreateValidationErrorResult(
                code: "news.invalid_category_id",
                message: "The supplied categoryId is invalid.",
                fieldName: "categoryId",
                fieldMessage: "categoryId must be a positive integer.");
        }

        var pageSizeResult = TryParsePageSize(httpContext.Request.Query["pageSize"].ToString());

        if (pageSizeResult.IsSuccess == false || pageSizeResult.Value is null)
        {
            return CreateValidationErrorResult(
                code: "news.invalid_page_size",
                message: "The supplied pageSize is invalid.",
                fieldName: "pageSize",
                fieldMessage: $"pageSize must be between 1 and {MaxPageSize}.");
        }

        var cursorResult = TryParseCursor(httpContext.Request.Query["cursor"].ToString());

        if (cursorResult.IsSuccess == false)
        {
            return CreateValidationErrorResult(
                code: "news.invalid_cursor",
                message: "The supplied cursor is invalid.",
                fieldName: "cursor",
                fieldMessage: "Cursor format must be {createdAtUtc}_{postId}.");
        }

        var newsPostListPageRecord = await newsRepository.GetPostsAsync(
            categoryId: categoryIdResult.Value.Value,
            pageSize: pageSizeResult.Value.Value,
            cursor: cursorResult.Value,
            cancellationToken: cancellationToken);

        var items = newsPostListPageRecord.Items
            .Select((newsPostListItemRecord) =>
            {
                return new NewsPostListItemResponse(
                    Id: newsPostListItemRecord.Id,
                    CategoryId: newsPostListItemRecord.CategoryId,
                    Title: newsPostListItemRecord.Title,
                    CreatedAt: FormatTimestamp(newsPostListItemRecord.CreatedAtUtc));
            })
            .ToArray();

        var nextCursor = newsPostListPageRecord.NextCursor is null
            ? null
            : FormatCursor(newsPostListPageRecord.NextCursor);

        return TypedResults.Ok(
            new NewsPostListResponse(
                Items: items,
                NextCursor: nextCursor));
    }

    private static ParseResult<NewsPostCursorRecord?> TryParseCursor(string rawCursor)
    {
        if (string.IsNullOrWhiteSpace(rawCursor))
        {
            return ParseResult<NewsPostCursorRecord?>.CreateSuccess(null);
        }

        var cursorParts = rawCursor.Split('_', 2, StringSplitOptions.TrimEntries);

        if (cursorParts.Length != 2 ||
            DateTimeOffset.TryParseExact(
                cursorParts[0],
                TimestampFormat,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal,
                out var createdAtUtc) == false ||
            int.TryParse(cursorParts[1], NumberStyles.Integer, CultureInfo.InvariantCulture, out var postId) == false ||
            postId <= 0)
        {
            return ParseResult<NewsPostCursorRecord?>.CreateFailure();
        }

        return ParseResult<NewsPostCursorRecord?>.CreateSuccess(
            new NewsPostCursorRecord(
                CreatedAtUtc: createdAtUtc,
                PostId: postId));
    }

    private static ParseResult<int?> TryParsePageSize(string rawPageSize)
    {
        if (string.IsNullOrWhiteSpace(rawPageSize))
        {
            return ParseResult<int?>.CreateSuccess(DefaultPageSize);
        }

        if (int.TryParse(rawPageSize, NumberStyles.Integer, CultureInfo.InvariantCulture, out var pageSize) == false ||
            pageSize < 1 ||
            pageSize > MaxPageSize)
        {
            return ParseResult<int?>.CreateFailure();
        }

        return ParseResult<int?>.CreateSuccess(pageSize);
    }

    private static ParseResult<int?> TryParsePositiveInteger(string rawValue)
    {
        if (int.TryParse(rawValue, NumberStyles.Integer, CultureInfo.InvariantCulture, out var numericValue) == false ||
            numericValue <= 0)
        {
            return ParseResult<int?>.CreateFailure();
        }

        return ParseResult<int?>.CreateSuccess(numericValue);
    }

    private static string FormatCursor(NewsPostCursorRecord newsPostCursorRecord)
    {
        return $"{FormatTimestamp(newsPostCursorRecord.CreatedAtUtc)}_{newsPostCursorRecord.PostId.ToString(CultureInfo.InvariantCulture)}";
    }

    private static string FormatTimestamp(DateTimeOffset timestamp)
    {
        return timestamp.UtcDateTime.ToString(TimestampFormat, CultureInfo.InvariantCulture);
    }

    private static IResult CreateValidationErrorResult(
        string code,
        string message,
        string fieldName,
        string fieldMessage)
    {
        return Results.Json(
            new ApiErrorResponse(
                Code: code,
                Message: message,
                FieldErrors: new Dictionary<string, string[]>
                {
                    [fieldName] = [fieldMessage],
                }),
            statusCode: StatusCodes.Status400BadRequest);
    }

    private sealed record ParseResult<T>(
        bool IsSuccess,
        T? Value)
    {
        public static ParseResult<T> CreateFailure()
        {
            return new ParseResult<T>(IsSuccess: false, Value: default);
        }

        public static ParseResult<T> CreateSuccess(T? value)
        {
            return new ParseResult<T>(IsSuccess: true, Value: value);
        }
    }
}
