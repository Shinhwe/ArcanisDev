using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

public sealed class AuthApiFactory : WebApplicationFactory<Program>
{
    private readonly FakeAuthTokenFactory authTokenFactory;

    public AuthApiFactory(string nextToken)
    {
        AuthRepository = new InMemoryAuthRepository();
        DownloadRepository = new InMemoryDownloadRepository();
        UserProfileRepository = new InMemoryUserProfileRepository();
        authTokenFactory = new FakeAuthTokenFactory(nextToken);
    }

    public InMemoryAuthRepository AuthRepository { get; }

    public InMemoryDownloadRepository DownloadRepository { get; }

    public InMemoryUserProfileRepository UserProfileRepository { get; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Development");
        builder.ConfigureServices((serviceCollection) =>
        {
            serviceCollection.RemoveAll<IAuthRepository>();
            serviceCollection.RemoveAll<IAuthTokenFactory>();
            serviceCollection.RemoveAll<IDownloadRepository>();
            serviceCollection.RemoveAll<IUserProfileRepository>();
            serviceCollection.RemoveAll<AuthService>();

            serviceCollection.AddSingleton(AuthRepository);
            serviceCollection.AddSingleton(DownloadRepository);
            serviceCollection.AddSingleton(UserProfileRepository);
            serviceCollection.AddSingleton<IAuthRepository>(AuthRepository);
            serviceCollection.AddSingleton<IDownloadRepository>(DownloadRepository);
            serviceCollection.AddSingleton<IUserProfileRepository>(UserProfileRepository);
            serviceCollection.AddSingleton<IAuthTokenFactory>(authTokenFactory);
            serviceCollection.AddScoped<AuthService>();
        });
    }
}
