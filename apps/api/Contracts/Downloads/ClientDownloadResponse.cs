public sealed record ClientDownloadResponse(
    IReadOnlyList<DownloadMirrorResponse> Mirrors);
