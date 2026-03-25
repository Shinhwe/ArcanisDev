public sealed class FakeAuthTokenFactory : IAuthTokenFactory
{
    private readonly string nextToken;

    public FakeAuthTokenFactory(string nextToken)
    {
        this.nextToken = nextToken;
    }

    public string CreateToken()
    {
        return nextToken;
    }
}
