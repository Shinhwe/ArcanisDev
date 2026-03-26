public sealed record ChangeEmailRequest(
    string CurrentPasswordHash,
    string NewEmail,
    string VerificationCode);
