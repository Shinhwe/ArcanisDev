using Microsoft.AspNetCore.Http.HttpResults;

public static class DownloadEndpoints
{
    public static IEndpointRouteBuilder MapDownloadEndpoints(
        this IEndpointRouteBuilder endpointRouteBuilder)
    {
        endpointRouteBuilder.MapGet("/api/v1/downloads/client", HandleGetClientDownloadsAsync)
            .WithName("GetClientDownloads");

        return endpointRouteBuilder;
    }

    private static async Task<Results<Ok<ClientDownloadResponse>, NotFound>> HandleGetClientDownloadsAsync(
        IDownloadRepository downloadRepository,
        CancellationToken cancellationToken)
    {
        var downloadMirrorsRecord = await downloadRepository.GetClientDownloadMirrorsAsync(cancellationToken);

        if (downloadMirrorsRecord is null)
        {
            return TypedResults.NotFound();
        }

        var mirrors = new[]
            {
                CreateDownloadMirrorResponse(
                    id: "mega",
                    label: "Mirror 1 (Mega)",
                    url: downloadMirrorsRecord.MegaMirrorUrl),
                CreateDownloadMirrorResponse(
                    id: "google-drive",
                    label: "Mirror 2 (Google Drive)",
                    url: downloadMirrorsRecord.DriveMirrorUrl),
            }
            .Where((downloadMirrorResponse) => downloadMirrorResponse is not null)
            .Cast<DownloadMirrorResponse>()
            .ToArray();

        return TypedResults.Ok(new ClientDownloadResponse(Mirrors: mirrors));
    }

    private static DownloadMirrorResponse? CreateDownloadMirrorResponse(
        string id,
        string label,
        string url)
    {
        if (string.IsNullOrWhiteSpace(url))
        {
            return null;
        }

        return new DownloadMirrorResponse(
            Id: id,
            Label: label,
            Url: url);
    }
}
