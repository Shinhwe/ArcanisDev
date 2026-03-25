public sealed class DatabaseOptions
{
    public const string SectionName = "Database";

    public string DatabaseName { get; init; } = string.Empty;

    public string Host { get; init; } = string.Empty;

    public string Password { get; init; } = string.Empty;

    public int Port { get; init; } = 3306;

    public string Provider { get; init; } = "MariaDb";

    public string Username { get; init; } = string.Empty;
}
