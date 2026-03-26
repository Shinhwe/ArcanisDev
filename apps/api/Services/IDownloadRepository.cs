public interface IDownloadRepository
{
    Task<DownloadMirrorsRecord?> GetClientDownloadMirrorsAsync(CancellationToken cancellationToken);
}
