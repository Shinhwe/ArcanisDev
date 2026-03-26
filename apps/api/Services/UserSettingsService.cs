using System.Text.RegularExpressions;

public sealed class UserSettingsService
{
    private const string ChangeEmailOperation = "change_email";
    private static readonly Regex PasswordHashPattern = new("^[a-fA-F0-9]{128}$", RegexOptions.Compiled);

    private readonly IAuthRepository authRepository;
    private readonly IUserSettingsRepository userSettingsRepository;

    public UserSettingsService(
        IAuthRepository authRepository,
        IUserSettingsRepository userSettingsRepository)
    {
        this.authRepository = authRepository;
        this.userSettingsRepository = userSettingsRepository;
    }

    public async Task<AuthServiceResult<CurrentUserResponse>> ChangeEmailAsync(
        long userId,
        ChangeEmailRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateChangeEmailRequest(request);

        if (validationError is not null)
        {
            return AuthServiceResult<CurrentUserResponse>.CreateFailure(validationError);
        }

        var currentUser = await authRepository.GetUserByIdAsync(userId, cancellationToken);

        if (currentUser is null)
        {
            return AuthServiceResult<CurrentUserResponse>.CreateFailure(CreateUnauthorizedError());
        }

        if (currentUser.PasswordHash != request.CurrentPasswordHash)
        {
            return AuthServiceResult<CurrentUserResponse>.CreateFailure(CreateInvalidCurrentPasswordError());
        }

        var normalizedNewEmail = request.NewEmail.Trim();

        if (normalizedNewEmail != currentUser.Email &&
            await authRepository.EmailExistsAsync(normalizedNewEmail, cancellationToken))
        {
            return AuthServiceResult<CurrentUserResponse>.CreateFailure(
                new AuthServiceError(
                    Code: "user_settings.email_taken",
                    Message: "Email is already in use.",
                    StatusCode: StatusCodes.Status409Conflict,
                    FieldErrors: new Dictionary<string, string[]>
                    {
                        ["newEmail"] = ["Email is already in use."],
                    }));
        }

        var verificationCodeRecord = await userSettingsRepository.GetPendingVerificationCodeAsync(
            userId,
            ChangeEmailOperation,
            normalizedNewEmail,
            cancellationToken);

        if (verificationCodeRecord is null ||
            verificationCodeRecord.VerificationCode != request.VerificationCode.Trim() ||
            verificationCodeRecord.ExpiresAt <= DateTime.UtcNow)
        {
            return AuthServiceResult<CurrentUserResponse>.CreateFailure(CreateInvalidVerificationCodeError());
        }

        await userSettingsRepository.UpdateUserEmailAsync(userId, normalizedNewEmail, cancellationToken);
        await userSettingsRepository.ConsumeVerificationCodeAsync(verificationCodeRecord.Id, cancellationToken);

        return AuthServiceResult<CurrentUserResponse>.CreateSuccess(
            new CurrentUserResponse(
                new AuthUserResponse(
                    Id: currentUser.Id,
                    Username: currentUser.Username,
                    Email: normalizedNewEmail,
                    Role: currentUser.Role)));
    }

    public async Task<AuthServiceResult> ChangePasswordAsync(
        long userId,
        ChangePasswordRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateChangePasswordRequest(request);

        if (validationError is not null)
        {
            return AuthServiceResult.CreateFailure(validationError);
        }

        var currentUser = await authRepository.GetUserByIdAsync(userId, cancellationToken);

        if (currentUser is null)
        {
            return AuthServiceResult.CreateFailure(CreateUnauthorizedError());
        }

        if (currentUser.PasswordHash != request.CurrentPasswordHash)
        {
            return AuthServiceResult.CreateFailure(CreateInvalidCurrentPasswordError());
        }

        await userSettingsRepository.UpdateUserPasswordHashAsync(
            userId,
            request.NewPasswordHash.Trim(),
            cancellationToken);
        await authRepository.RevokeAllTokensForUserAsync(userId, "password_change", cancellationToken);

        return AuthServiceResult.CreateSuccess();
    }

    public async Task<AuthServiceResult<SendEmailVerificationCodeResponse>> SendEmailVerificationCodeAsync(
        long userId,
        SendEmailVerificationCodeRequest request,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateSendEmailVerificationCodeRequest(request);

        if (validationError is not null)
        {
            return AuthServiceResult<SendEmailVerificationCodeResponse>.CreateFailure(validationError);
        }

        var currentUser = await authRepository.GetUserByIdAsync(userId, cancellationToken);

        if (currentUser is null)
        {
            return AuthServiceResult<SendEmailVerificationCodeResponse>.CreateFailure(CreateUnauthorizedError());
        }

        if (currentUser.PasswordHash != request.CurrentPasswordHash)
        {
            return AuthServiceResult<SendEmailVerificationCodeResponse>.CreateFailure(CreateInvalidCurrentPasswordError());
        }

        var normalizedNewEmail = request.NewEmail.Trim();

        if (normalizedNewEmail != currentUser.Email &&
            await authRepository.EmailExistsAsync(normalizedNewEmail, cancellationToken))
        {
            return AuthServiceResult<SendEmailVerificationCodeResponse>.CreateFailure(
                new AuthServiceError(
                    Code: "user_settings.email_taken",
                    Message: "Email is already in use.",
                    StatusCode: StatusCodes.Status409Conflict,
                    FieldErrors: new Dictionary<string, string[]>
                    {
                        ["newEmail"] = ["Email is already in use."],
                    }));
        }

        await userSettingsRepository.InvalidatePendingVerificationCodesAsync(
            userId,
            ChangeEmailOperation,
            normalizedNewEmail,
            cancellationToken);

        var existingVerificationCode = await userSettingsRepository.GetPendingVerificationCodeAsync(
            userId,
            ChangeEmailOperation,
            normalizedNewEmail,
            cancellationToken);

        if (existingVerificationCode is not null && existingVerificationCode.ExpiresAt > DateTime.UtcNow)
        {
            return AuthServiceResult<SendEmailVerificationCodeResponse>.CreateSuccess(
                new SendEmailVerificationCodeResponse(
                    Message: "Verification code generated.",
                    VerificationCodePreview: existingVerificationCode.VerificationCode));
        }

        var verificationCode = CreateVerificationCode();

        await userSettingsRepository.CreateVerificationCodeAsync(
            userId,
            ChangeEmailOperation,
            normalizedNewEmail,
            verificationCode,
            DateTime.UtcNow.AddMinutes(10),
            cancellationToken);

        // TODO: Send the verification code through the future outbound email service

        return AuthServiceResult<SendEmailVerificationCodeResponse>.CreateSuccess(
            new SendEmailVerificationCodeResponse(
                Message: "Verification code generated.",
                VerificationCodePreview: verificationCode));
    }

    private static AuthServiceError CreateInvalidCurrentPasswordError()
    {
        return new AuthServiceError(
            Code: "user_settings.invalid_current_password",
            Message: "Current password is incorrect.",
            StatusCode: StatusCodes.Status400BadRequest,
            FieldErrors: new Dictionary<string, string[]>
            {
                ["currentPasswordHash"] = ["Current password is incorrect."],
            });
    }

    private static AuthServiceError CreateInvalidVerificationCodeError()
    {
        return new AuthServiceError(
            Code: "user_settings.invalid_verification_code",
            Message: "Verification code is invalid or expired.",
            StatusCode: StatusCodes.Status400BadRequest,
            FieldErrors: new Dictionary<string, string[]>
            {
                ["verificationCode"] = ["Verification code is invalid or expired."],
            });
    }

    private static AuthServiceError CreateUnauthorizedError()
    {
        return new AuthServiceError(
            Code: "auth.unauthorized",
            Message: "Authentication is required.",
            StatusCode: StatusCodes.Status401Unauthorized);
    }

    private static string CreateVerificationCode()
    {
        return Random.Shared.Next(0, 1_000_000).ToString("D6");
    }

    private static AuthServiceError? ValidateChangeEmailRequest(ChangeEmailRequest request)
    {
        var fieldErrors = new Dictionary<string, string[]>();

        if (IsValidPasswordHash(request.CurrentPasswordHash) == false)
        {
            fieldErrors["currentPasswordHash"] = ["Current password hash must be a 128-character hexadecimal string."];
        }

        if (string.IsNullOrWhiteSpace(request.NewEmail))
        {
            fieldErrors["newEmail"] = ["New email is required."];
        }

        if (string.IsNullOrWhiteSpace(request.VerificationCode))
        {
            fieldErrors["verificationCode"] = ["Verification code is required."];
        }

        return fieldErrors.Count == 0 ? null : CreateValidationError(fieldErrors);
    }

    private static AuthServiceError? ValidateChangePasswordRequest(ChangePasswordRequest request)
    {
        var fieldErrors = new Dictionary<string, string[]>();

        if (IsValidPasswordHash(request.CurrentPasswordHash) == false)
        {
            fieldErrors["currentPasswordHash"] = ["Current password hash must be a 128-character hexadecimal string."];
        }

        if (IsValidPasswordHash(request.NewPasswordHash) == false)
        {
            fieldErrors["newPasswordHash"] = ["New password hash must be a 128-character hexadecimal string."];
        }

        return fieldErrors.Count == 0 ? null : CreateValidationError(fieldErrors);
    }

    private static AuthServiceError? ValidateSendEmailVerificationCodeRequest(
        SendEmailVerificationCodeRequest request)
    {
        var fieldErrors = new Dictionary<string, string[]>();

        if (IsValidPasswordHash(request.CurrentPasswordHash) == false)
        {
            fieldErrors["currentPasswordHash"] = ["Current password hash must be a 128-character hexadecimal string."];
        }

        if (string.IsNullOrWhiteSpace(request.NewEmail))
        {
            fieldErrors["newEmail"] = ["New email is required."];
        }

        return fieldErrors.Count == 0 ? null : CreateValidationError(fieldErrors);
    }

    private static AuthServiceError CreateValidationError(
        IReadOnlyDictionary<string, string[]> fieldErrors)
    {
        return new AuthServiceError(
            Code: "user_settings.validation_failed",
            Message: "One or more validation errors occurred.",
            StatusCode: StatusCodes.Status400BadRequest,
            FieldErrors: fieldErrors);
    }

    private static bool IsValidPasswordHash(string passwordHash)
    {
        return string.IsNullOrWhiteSpace(passwordHash) == false &&
            PasswordHashPattern.IsMatch(passwordHash.Trim());
    }
}
