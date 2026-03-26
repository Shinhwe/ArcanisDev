public sealed record UserVerificationCodeRecord(
    long Id,
    long UserId,
    string Operation,
    string TargetValue,
    string VerificationCode,
    DateTime CreatedAt,
    DateTime ExpiresAt,
    DateTime? ConsumedAt,
    DateTime? InvalidatedAt);
