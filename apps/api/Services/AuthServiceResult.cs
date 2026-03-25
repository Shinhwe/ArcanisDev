public sealed class AuthServiceResult
{
    public AuthServiceError? Error { get; }

    public bool IsSuccess => Error is null;

    private AuthServiceResult(AuthServiceError? error)
    {
        Error = error;
    }

    public static AuthServiceResult CreateFailure(AuthServiceError error)
    {
        return new AuthServiceResult(error);
    }

    public static AuthServiceResult CreateSuccess()
    {
        return new AuthServiceResult(null);
    }
}

public sealed class AuthServiceResult<T>
{
    public T? Data { get; }

    public AuthServiceError? Error { get; }

    public bool IsSuccess => Error is null;

    private AuthServiceResult(T? data, AuthServiceError? error)
    {
        Data = data;
        Error = error;
    }

    public static AuthServiceResult<T> CreateFailure(AuthServiceError error)
    {
        return new AuthServiceResult<T>(default, error);
    }

    public static AuthServiceResult<T> CreateSuccess(T data)
    {
        return new AuthServiceResult<T>(data, null);
    }
}
