public interface IUserSettingsRepository
{
    Task<UserVerificationCodeRecord> CreateVerificationCodeAsync(
        long userId,
        string operation,
        string targetValue,
        string verificationCode,
        DateTime expiresAt,
        CancellationToken cancellationToken);

    Task ConsumeVerificationCodeAsync(long verificationCodeId, CancellationToken cancellationToken);

    Task<UserVerificationCodeRecord?> GetPendingVerificationCodeAsync(
        long userId,
        string operation,
        string targetValue,
        CancellationToken cancellationToken);

    Task InvalidatePendingVerificationCodesAsync(
        long userId,
        string operation,
        string preservedTargetValue,
        CancellationToken cancellationToken);

    Task UpdateUserEmailAsync(long userId, string email, CancellationToken cancellationToken);

    Task UpdateUserPasswordHashAsync(long userId, string passwordHash, CancellationToken cancellationToken);
}
