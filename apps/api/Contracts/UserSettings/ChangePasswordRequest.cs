public sealed record ChangePasswordRequest(
    string CurrentPasswordHash,
    string NewPasswordHash);
