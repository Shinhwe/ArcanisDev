public sealed record AuthServiceError(
    string Code,
    string Message,
    int StatusCode,
    IReadOnlyDictionary<string, string[]>? FieldErrors = null);
