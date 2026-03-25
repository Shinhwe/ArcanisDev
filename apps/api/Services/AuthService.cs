using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;

public sealed class AuthService
{
    private static readonly Regex PasswordHashPattern = new("^[a-fA-F0-9]{128}$", RegexOptions.Compiled);

    private readonly IAuthRepository authRepository;
    private readonly IAuthTokenFactory authTokenFactory;
    private readonly ILogger<AuthService> logger;

    public AuthService(IAuthRepository authRepository, IAuthTokenFactory authTokenFactory)
        : this(authRepository, authTokenFactory, NullLogger<AuthService>.Instance)
    {
    }

    public AuthService(
        IAuthRepository authRepository,
        IAuthTokenFactory authTokenFactory,
        ILogger<AuthService> logger)
    {
        this.authRepository = authRepository;
        this.authTokenFactory = authTokenFactory;
        this.logger = logger;
    }

    public async Task<AuthServiceResult<CurrentUserResponse>> GetCurrentUserAsync(
        string token,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return AuthServiceResult<CurrentUserResponse>.CreateFailure(
                CreateUnauthorizedError("auth.unauthorized", "Authentication is required."));
        }

        var activeTokenRecord = await authRepository.GetActiveTokenAsync(token, cancellationToken);

        if (activeTokenRecord is null)
        {
            return AuthServiceResult<CurrentUserResponse>.CreateFailure(
                CreateUnauthorizedError("auth.unauthorized", "Authentication is required."));
        }

        var userRecord = await authRepository.GetUserByIdAsync(activeTokenRecord.UserId, cancellationToken);

        if (userRecord is null || userRecord.Status != "active")
        {
            return AuthServiceResult<CurrentUserResponse>.CreateFailure(
                CreateUnauthorizedError("auth.unauthorized", "Authentication is required."));
        }

        await authRepository.TouchTokenAsync(token, cancellationToken);

        return AuthServiceResult<CurrentUserResponse>.CreateSuccess(
            new CurrentUserResponse(MapAuthUserResponse(userRecord)));
    }

    public async Task<AuthServiceResult<AuthSessionResponse>> LoginAsync(
        LoginRequest request,
        AuthClientMetadata metadata,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateLoginRequest(request);

        if (validationError is not null)
        {
            return AuthServiceResult<AuthSessionResponse>.CreateFailure(validationError);
        }

        var userRecord = await authRepository.GetUserByUsernameAsync(
            request.Username.Trim(),
            cancellationToken);

        if (userRecord is null)
        {
            logger.LogWarning("Login failed for username {Username}: user not found.", request.Username.Trim());

            return AuthServiceResult<AuthSessionResponse>.CreateFailure(
                CreateUnauthorizedError("auth.invalid_credentials", "Invalid username or password."));
        }

        if (userRecord.PasswordHash != request.PasswordHash)
        {
            logger.LogWarning("Login failed for username {Username}: password hash mismatch.", userRecord.Username);

            return AuthServiceResult<AuthSessionResponse>.CreateFailure(
                CreateUnauthorizedError("auth.invalid_credentials", "Invalid username or password."));
        }

        if (userRecord.Status != "active")
        {
            logger.LogWarning(
                "Login failed for username {Username}: user status is {Status}.",
                userRecord.Username,
                userRecord.Status);

            return AuthServiceResult<AuthSessionResponse>.CreateFailure(
                new AuthServiceError(
                    Code: "auth.user_disabled",
                    Message: "This account is disabled.",
                    StatusCode: StatusCodes.Status403Forbidden));
        }

        return await CreateAuthSessionResponseAsync(userRecord, metadata, cancellationToken);
    }

    public async Task<AuthServiceResult<AuthSessionResponse>> RegisterAsync(
        RegisterRequest request,
        AuthClientMetadata metadata,
        CancellationToken cancellationToken)
    {
        var validationError = ValidateRegisterRequest(request);

        if (validationError is not null)
        {
            return AuthServiceResult<AuthSessionResponse>.CreateFailure(validationError);
        }

        var normalizedUsername = request.Username.Trim();
        var normalizedEmail = request.Email.Trim();

        if (await authRepository.UsernameExistsAsync(normalizedUsername, cancellationToken))
        {
            logger.LogInformation("Register failed for username {Username}: username already exists.", normalizedUsername);

            return AuthServiceResult<AuthSessionResponse>.CreateFailure(
                new AuthServiceError(
                    Code: "auth.username_taken",
                    Message: "Username is already in use.",
                    StatusCode: StatusCodes.Status409Conflict,
                    FieldErrors: new Dictionary<string, string[]>
                    {
                        ["username"] = ["Username is already in use."],
                    }));
        }

        if (await authRepository.EmailExistsAsync(normalizedEmail, cancellationToken))
        {
            logger.LogInformation("Register failed for email {Email}: email already exists.", normalizedEmail);

            return AuthServiceResult<AuthSessionResponse>.CreateFailure(
                new AuthServiceError(
                    Code: "auth.email_taken",
                    Message: "Email is already in use.",
                    StatusCode: StatusCodes.Status409Conflict,
                    FieldErrors: new Dictionary<string, string[]>
                    {
                        ["email"] = ["Email is already in use."],
                    }));
        }

        var userRecord = await authRepository.CreateUserAsync(
            normalizedUsername,
            normalizedEmail,
            request.PasswordHash,
            role: "user",
            status: "active",
            cancellationToken);

        logger.LogInformation("Registered auth user {Username} with id {UserId}.", userRecord.Username, userRecord.Id);

        return await CreateAuthSessionResponseAsync(userRecord, metadata, cancellationToken);
    }

    public async Task<AuthServiceResult> LogoutAsync(string token, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(token))
        {
            return AuthServiceResult.CreateFailure(
                CreateUnauthorizedError("auth.unauthorized", "Authentication is required."));
        }

        var activeTokenRecord = await authRepository.GetActiveTokenAsync(token, cancellationToken);

        if (activeTokenRecord is null)
        {
            logger.LogInformation("Logout skipped because token was not active.");

            return AuthServiceResult.CreateFailure(
                CreateUnauthorizedError("auth.unauthorized", "Authentication is required."));
        }

        await authRepository.RevokeTokenAsync(token, "logout", cancellationToken);
        logger.LogInformation("Revoked auth token for user id {UserId}.", activeTokenRecord.UserId);

        return AuthServiceResult.CreateSuccess();
    }

    private async Task<AuthServiceResult<AuthSessionResponse>> CreateAuthSessionResponseAsync(
        AuthUserRecord userRecord,
        AuthClientMetadata metadata,
        CancellationToken cancellationToken)
    {
        var token = authTokenFactory.CreateToken();

        await authRepository.CreateTokenAsync(
            userRecord.Id,
            token,
            metadata.ClientIp,
            metadata.UserAgent,
            cancellationToken);

        return AuthServiceResult<AuthSessionResponse>.CreateSuccess(
            new AuthSessionResponse(
                Token: token,
                User: MapAuthUserResponse(userRecord)));
    }

    private static AuthUserResponse MapAuthUserResponse(AuthUserRecord userRecord)
    {
        return new AuthUserResponse(
            Id: userRecord.Id,
            Username: userRecord.Username,
            Email: userRecord.Email,
            Role: userRecord.Role);
    }

    private static AuthServiceError? ValidateLoginRequest(LoginRequest request)
    {
        var fieldErrors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Username))
        {
            fieldErrors["username"] = ["Username is required."];
        }

        if (IsValidPasswordHash(request.PasswordHash) == false)
        {
            fieldErrors["passwordHash"] = ["Password hash must be a 128-character hexadecimal string."];
        }

        if (fieldErrors.Count == 0)
        {
            return null;
        }

        return CreateValidationError(fieldErrors);
    }

    private static AuthServiceError? ValidateRegisterRequest(RegisterRequest request)
    {
        var fieldErrors = new Dictionary<string, string[]>();

        if (string.IsNullOrWhiteSpace(request.Username))
        {
            fieldErrors["username"] = ["Username is required."];
        }

        if (string.IsNullOrWhiteSpace(request.Email))
        {
            fieldErrors["email"] = ["Email is required."];
        }

        if (IsValidPasswordHash(request.PasswordHash) == false)
        {
            fieldErrors["passwordHash"] = ["Password hash must be a 128-character hexadecimal string."];
        }

        if (fieldErrors.Count == 0)
        {
            return null;
        }

        return CreateValidationError(fieldErrors);
    }

    private static AuthServiceError CreateUnauthorizedError(string code, string message)
    {
        return new AuthServiceError(
            Code: code,
            Message: message,
            StatusCode: StatusCodes.Status401Unauthorized);
    }

    private static AuthServiceError CreateValidationError(Dictionary<string, string[]> fieldErrors)
    {
        return new AuthServiceError(
            Code: "auth.validation_failed",
            Message: "Validation failed.",
            StatusCode: StatusCodes.Status400BadRequest,
            FieldErrors: fieldErrors);
    }

    private static bool IsValidPasswordHash(string passwordHash)
    {
        return PasswordHashPattern.IsMatch(passwordHash);
    }
}
