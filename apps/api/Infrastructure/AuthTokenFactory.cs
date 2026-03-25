using System.Security.Cryptography;

public sealed class AuthTokenFactory : IAuthTokenFactory
{
    public string CreateToken()
    {
        var randomBytes = RandomNumberGenerator.GetBytes(32);

        return Convert.ToHexString(randomBytes).ToLowerInvariant();
    }
}
