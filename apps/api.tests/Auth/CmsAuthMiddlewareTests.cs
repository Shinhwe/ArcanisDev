using Microsoft.AspNetCore.Http;

public sealed class CmsAuthMiddlewareTests
{
    [Fact]
    public async Task InvokeAsync_allows_anonymous_access_for_public_endpoints()
    {
        var authRepository = new InMemoryAuthRepository();
        var didInvokeNext = false;
        var middleware = new CmsAuthMiddleware(
            next: (httpContext) =>
            {
                didInvokeNext = true;

                return Task.CompletedTask;
            });
        var httpContext = new DefaultHttpContext();

        httpContext.SetEndpoint(new Endpoint(
            requestDelegate: (_) => Task.CompletedTask,
            metadata: new EndpointMetadataCollection(),
            displayName: "PublicEndpoint"));

        await middleware.InvokeAsync(httpContext, authRepository);

        Assert.True(didInvokeNext);
        Assert.Equal(StatusCodes.Status200OK, httpContext.Response.StatusCode);
    }

    [Fact]
    public async Task InvokeAsync_returns_unauthorized_for_protected_endpoints_without_a_token()
    {
        var authRepository = new InMemoryAuthRepository();
        var didInvokeNext = false;
        var middleware = new CmsAuthMiddleware(
            next: (_) =>
            {
                didInvokeNext = true;

                return Task.CompletedTask;
            });
        var httpContext = new DefaultHttpContext();

        httpContext.SetEndpoint(new Endpoint(
            requestDelegate: (_) => Task.CompletedTask,
            metadata: new EndpointMetadataCollection(new RequireCmsAuthAttribute()),
            displayName: "ProtectedEndpoint"));

        await middleware.InvokeAsync(httpContext, authRepository);

        Assert.False(didInvokeNext);
        Assert.Equal(StatusCodes.Status401Unauthorized, httpContext.Response.StatusCode);
    }

    [Fact]
    public async Task InvokeAsync_attaches_auth_context_for_protected_endpoints_with_an_active_token()
    {
        var authRepository = new InMemoryAuthRepository();
        var seededUser = authRepository.SeedUser(
            username: "alpha",
            email: "alpha@example.com",
            passwordHash: CreateValidPasswordHash(),
            role: "admin");

        authRepository.SeedToken(seededUser.Id, "token-protected");

        var didInvokeNext = false;
        var middleware = new CmsAuthMiddleware(
            next: (httpContext) =>
            {
                didInvokeNext = true;

                Assert.NotNull(httpContext.GetCmsAuthContext());
                Assert.Equal("alpha", httpContext.GetCmsAuthContext()!.Username);

                return Task.CompletedTask;
            });
        var httpContext = new DefaultHttpContext();

        httpContext.Request.Headers.Authorization = "Bearer token-protected";
        httpContext.SetEndpoint(new Endpoint(
            requestDelegate: (_) => Task.CompletedTask,
            metadata: new EndpointMetadataCollection(new RequireCmsAuthAttribute()),
            displayName: "ProtectedEndpoint"));

        await middleware.InvokeAsync(httpContext, authRepository);

        Assert.True(didInvokeNext);
        Assert.Equal(StatusCodes.Status200OK, httpContext.Response.StatusCode);
    }

    private static string CreateValidPasswordHash()
    {
        return string.Concat(Enumerable.Repeat("a", 128));
    }
}
