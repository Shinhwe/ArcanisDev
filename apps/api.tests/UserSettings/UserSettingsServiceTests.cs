public sealed class UserSettingsServiceTests
{
    [Fact]
    public async Task SendEmailVerificationCodeAsync_reuses_an_unexpired_code_for_the_same_target_email()
    {
        var authRepository = new InMemoryAuthRepository();
        var userSettingsRepository = new InMemoryUserSettingsRepository(authRepository);
        var seededUser = authRepository.SeedUser(
            username: "alpha",
            email: "alpha@example.com",
            passwordHash: CreateValidPasswordHash());
        var userSettingsService = new UserSettingsService(authRepository, userSettingsRepository);

        var firstResult = await userSettingsService.SendEmailVerificationCodeAsync(
            seededUser.Id,
            new SendEmailVerificationCodeRequest(
                CurrentPasswordHash: CreateValidPasswordHash(),
                NewEmail: "updated@example.com"),
            CancellationToken.None);

        var secondResult = await userSettingsService.SendEmailVerificationCodeAsync(
            seededUser.Id,
            new SendEmailVerificationCodeRequest(
                CurrentPasswordHash: CreateValidPasswordHash(),
                NewEmail: "updated@example.com"),
            CancellationToken.None);

        Assert.True(firstResult.IsSuccess);
        Assert.True(secondResult.IsSuccess);
        Assert.NotNull(firstResult.Data);
        Assert.NotNull(secondResult.Data);
        Assert.Equal(firstResult.Data.VerificationCodePreview, secondResult.Data.VerificationCodePreview);
        Assert.Single(
            userSettingsRepository.VerificationCodes,
            (verificationCodeRecord) =>
                verificationCodeRecord.InvalidatedAt is null &&
                verificationCodeRecord.ConsumedAt is null);
    }

    [Fact]
    public async Task SendEmailVerificationCodeAsync_invalidates_the_previous_pending_code_when_the_target_email_changes()
    {
        var authRepository = new InMemoryAuthRepository();
        var userSettingsRepository = new InMemoryUserSettingsRepository(authRepository);
        var seededUser = authRepository.SeedUser(
            username: "alpha",
            email: "alpha@example.com",
            passwordHash: CreateValidPasswordHash());
        var userSettingsService = new UserSettingsService(authRepository, userSettingsRepository);

        var firstResult = await userSettingsService.SendEmailVerificationCodeAsync(
            seededUser.Id,
            new SendEmailVerificationCodeRequest(
                CurrentPasswordHash: CreateValidPasswordHash(),
                NewEmail: "first@example.com"),
            CancellationToken.None);

        var secondResult = await userSettingsService.SendEmailVerificationCodeAsync(
            seededUser.Id,
            new SendEmailVerificationCodeRequest(
                CurrentPasswordHash: CreateValidPasswordHash(),
                NewEmail: "second@example.com"),
            CancellationToken.None);

        Assert.True(firstResult.IsSuccess);
        Assert.True(secondResult.IsSuccess);
        Assert.NotNull(userSettingsRepository.VerificationCodes.Single((verificationCodeRecord) =>
            verificationCodeRecord.TargetValue == "first@example.com").InvalidatedAt);
        Assert.Null(userSettingsRepository.VerificationCodes.Single((verificationCodeRecord) =>
            verificationCodeRecord.TargetValue == "second@example.com").InvalidatedAt);
    }

    [Fact]
    public async Task ChangeEmailAsync_updates_the_cms_user_email_and_consumes_the_matching_verification_code()
    {
        var authRepository = new InMemoryAuthRepository();
        var userSettingsRepository = new InMemoryUserSettingsRepository(authRepository);
        var seededUser = authRepository.SeedUser(
            username: "alpha",
            email: "alpha@example.com",
            passwordHash: CreateValidPasswordHash());
        var userSettingsService = new UserSettingsService(authRepository, userSettingsRepository);
        var sendCodeResult = await userSettingsService.SendEmailVerificationCodeAsync(
            seededUser.Id,
            new SendEmailVerificationCodeRequest(
                CurrentPasswordHash: CreateValidPasswordHash(),
                NewEmail: "updated@example.com"),
            CancellationToken.None);

        var result = await userSettingsService.ChangeEmailAsync(
            seededUser.Id,
            new ChangeEmailRequest(
                CurrentPasswordHash: CreateValidPasswordHash(),
                NewEmail: "updated@example.com",
                VerificationCode: sendCodeResult.Data!.VerificationCodePreview),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.Equal(
            "updated@example.com",
            authRepository.Users.Single((userRecord) => userRecord.Id == seededUser.Id).Email);
        Assert.NotNull(userSettingsRepository.VerificationCodes.Single().ConsumedAt);
    }

    [Fact]
    public async Task ChangePasswordAsync_revokes_all_active_tokens_for_the_user()
    {
        var authRepository = new InMemoryAuthRepository();
        var userSettingsRepository = new InMemoryUserSettingsRepository(authRepository);
        var seededUser = authRepository.SeedUser(
            username: "alpha",
            email: "alpha@example.com",
            passwordHash: CreateValidPasswordHash());

        authRepository.SeedToken(seededUser.Id, "token-a");
        authRepository.SeedToken(seededUser.Id, "token-b");

        var userSettingsService = new UserSettingsService(authRepository, userSettingsRepository);
        var result = await userSettingsService.ChangePasswordAsync(
            seededUser.Id,
            new ChangePasswordRequest(
                CurrentPasswordHash: CreateValidPasswordHash(),
                NewPasswordHash: CreateDifferentPasswordHash()),
            CancellationToken.None);

        Assert.True(result.IsSuccess);
        Assert.All(
            authRepository.Tokens.Where((tokenRecord) => tokenRecord.UserId == seededUser.Id),
            (tokenRecord) =>
            {
                Assert.NotNull(tokenRecord.RevokedAt);
            });
    }

    private static string CreateDifferentPasswordHash()
    {
        return string.Concat(Enumerable.Repeat("b", 128));
    }

    private static string CreateValidPasswordHash()
    {
        return string.Concat(Enumerable.Repeat("a", 128));
    }
}
