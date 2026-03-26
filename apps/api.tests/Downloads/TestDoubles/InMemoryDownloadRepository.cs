public sealed class InMemoryDownloadRepository : IDownloadRepository
{
    private DownloadMirrorsRecord? downloadMirrorsRecord = new(
        DriveMirrorUrl: string.Empty,
        MegaMirrorUrl: string.Empty);

    public Task<DownloadMirrorsRecord?> GetClientDownloadMirrorsAsync(CancellationToken cancellationToken)
    {
        return Task.FromResult(downloadMirrorsRecord);
    }

    public void RemoveConfigRow()
    {
        downloadMirrorsRecord = null;
    }

    public void SetMirrorUrls(string? megaUrl, string? driveUrl)
    {
        downloadMirrorsRecord = new DownloadMirrorsRecord(
            DriveMirrorUrl: driveUrl ?? string.Empty,
            MegaMirrorUrl: megaUrl ?? string.Empty);
    }
}
