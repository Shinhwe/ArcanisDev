using Microsoft.AspNetCore.Mvc.Testing;

public sealed class ApiStartupTests
{
    [Fact]
    public void CreateClient_starts_the_application_successfully()
    {
        using var webApplicationFactory = new WebApplicationFactory<Program>();

        var startupException = Record.Exception(() => webApplicationFactory.CreateClient());

        Assert.Null(startupException);
    }
}
