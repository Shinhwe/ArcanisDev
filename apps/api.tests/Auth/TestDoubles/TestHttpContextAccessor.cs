using Microsoft.AspNetCore.Http;

public sealed class TestHttpContextAccessor
{
    public static DefaultHttpContext CreateProtectedHttpContext(string? token = null)
    {
        var httpContext = new DefaultHttpContext();

        if (string.IsNullOrWhiteSpace(token) == false)
        {
            httpContext.Request.Headers.Authorization = $"Bearer {token}";
        }

        httpContext.SetEndpoint(new Endpoint(
            requestDelegate: (_) => Task.CompletedTask,
            metadata: new EndpointMetadataCollection(new RequireCmsAuthAttribute()),
            displayName: "ProtectedEndpoint"));

        return httpContext;
    }
}
