public sealed record CmsAuthContext(
    long UserId,
    string Username,
    string Email,
    string Role,
    string Token);
