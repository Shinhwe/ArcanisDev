public sealed class InMemoryUserSettingsRepository : IUserSettingsRepository
{
    private readonly InMemoryAuthRepository authRepository;
    private long nextVerificationCodeId = 1;

    public InMemoryUserSettingsRepository(InMemoryAuthRepository authRepository)
    {
        this.authRepository = authRepository;
    }

    public List<UserVerificationCodeRecord> VerificationCodes { get; } = [];

    public Task<UserVerificationCodeRecord> CreateVerificationCodeAsync(
        long userId,
        string operation,
        string targetValue,
        string verificationCode,
        DateTime expiresAt,
        CancellationToken cancellationToken)
    {
        var verificationCodeRecord = new UserVerificationCodeRecord(
            Id: nextVerificationCodeId++,
            UserId: userId,
            Operation: operation,
            TargetValue: targetValue,
            VerificationCode: verificationCode,
            CreatedAt: DateTime.UtcNow,
            ExpiresAt: expiresAt,
            ConsumedAt: null,
            InvalidatedAt: null);

        VerificationCodes.Add(verificationCodeRecord);

        return Task.FromResult(verificationCodeRecord);
    }

    public Task<UserVerificationCodeRecord?> GetPendingVerificationCodeAsync(
        long userId,
        string operation,
        string targetValue,
        CancellationToken cancellationToken)
    {
        return Task.FromResult(VerificationCodes.SingleOrDefault((verificationCodeRecord) =>
            verificationCodeRecord.UserId == userId &&
            verificationCodeRecord.Operation == operation &&
            verificationCodeRecord.TargetValue == targetValue &&
            verificationCodeRecord.ConsumedAt is null &&
            verificationCodeRecord.InvalidatedAt is null));
    }

    public Task InvalidatePendingVerificationCodesAsync(
        long userId,
        string operation,
        string preservedTargetValue,
        CancellationToken cancellationToken)
    {
        var pendingVerificationCodes = VerificationCodes
            .Where((verificationCodeRecord) =>
                verificationCodeRecord.UserId == userId &&
                verificationCodeRecord.Operation == operation &&
                verificationCodeRecord.TargetValue != preservedTargetValue &&
                verificationCodeRecord.ConsumedAt is null &&
                verificationCodeRecord.InvalidatedAt is null)
            .ToArray();

        foreach (var pendingVerificationCode in pendingVerificationCodes)
        {
            var pendingVerificationCodeIndex = VerificationCodes.FindIndex((verificationCodeRecord) =>
                verificationCodeRecord.Id == pendingVerificationCode.Id);

            VerificationCodes[pendingVerificationCodeIndex] = pendingVerificationCode with
            {
                InvalidatedAt = DateTime.UtcNow,
            };
        }

        return Task.CompletedTask;
    }

    public Task ConsumeVerificationCodeAsync(long verificationCodeId, CancellationToken cancellationToken)
    {
        var verificationCodeRecord = VerificationCodes.Single((existingVerificationCodeRecord) =>
            existingVerificationCodeRecord.Id == verificationCodeId);
        var verificationCodeIndex = VerificationCodes.FindIndex((existingVerificationCodeRecord) =>
            existingVerificationCodeRecord.Id == verificationCodeId);

        VerificationCodes[verificationCodeIndex] = verificationCodeRecord with
        {
            ConsumedAt = DateTime.UtcNow,
        };

        return Task.CompletedTask;
    }

    public Task UpdateUserEmailAsync(long userId, string email, CancellationToken cancellationToken)
    {
        var userRecord = authRepository.Users.Single((existingUserRecord) => existingUserRecord.Id == userId);
        var userIndex = authRepository.Users.FindIndex((existingUserRecord) => existingUserRecord.Id == userId);

        authRepository.Users[userIndex] = userRecord with
        {
            Email = email,
            UpdatedAt = DateTime.UtcNow,
        };

        return Task.CompletedTask;
    }

    public Task UpdateUserPasswordHashAsync(long userId, string passwordHash, CancellationToken cancellationToken)
    {
        var userRecord = authRepository.Users.Single((existingUserRecord) => existingUserRecord.Id == userId);
        var userIndex = authRepository.Users.FindIndex((existingUserRecord) => existingUserRecord.Id == userId);

        authRepository.Users[userIndex] = userRecord with
        {
            PasswordHash = passwordHash,
            UpdatedAt = DateTime.UtcNow,
        };

        return Task.CompletedTask;
    }
}
