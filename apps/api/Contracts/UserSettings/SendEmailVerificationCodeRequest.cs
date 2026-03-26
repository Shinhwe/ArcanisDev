public sealed record SendEmailVerificationCodeRequest(
    string CurrentPasswordHash,
    string NewEmail);
