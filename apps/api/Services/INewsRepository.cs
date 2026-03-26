public interface INewsRepository
{
    Task<IReadOnlyList<NewsCategoryRecord>> GetCategoriesAsync(CancellationToken cancellationToken);

    Task<NewsPostListPageRecord> GetPostsAsync(
        int categoryId,
        int pageSize,
        NewsPostCursorRecord? cursor,
        CancellationToken cancellationToken);

    Task<NewsPostDetailRecord?> GetPostByIdAsync(int postId, CancellationToken cancellationToken);
}
