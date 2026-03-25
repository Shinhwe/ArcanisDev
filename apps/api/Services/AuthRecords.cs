public sealed record AuthTokenRecord(
    long Id,
    long UserId,
    string Token,
    DateTime CreatedAt,
    DateTime? LastUsedAt,
    DateTime? RevokedAt,
    string? RevokedReason,
    string? ClientIp,
    string? UserAgent);

public sealed record AuthUserRecord(
    long Id,
    string Username,
    string Email,
    string PasswordHash,
    string Role,
    string Status,
    DateTime CreatedAt,
    DateTime UpdatedAt);
