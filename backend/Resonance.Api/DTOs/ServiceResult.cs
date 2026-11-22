namespace Resonance.Api.DTOs;

public record ServiceResult<T>(
    bool Success,
    int StatusCode,
    T? Data = default,
    string? Error = null)
{
    public static ServiceResult<T> Ok(T data) => new(true, 200, data);
    public static ServiceResult<T> Created(T data) => new(true, 201, data);
    public static ServiceResult<T> BadRequest(string error) => new(false, 400, default, error);
    public static ServiceResult<T> Unauthorized(string error) => new(false, 401, default, error);
    public static ServiceResult<T> Forbidden(string error) => new(false, 403, default, error);
    public static ServiceResult<T> NotFound(string error) => new(false, 404, default, error);
    public static ServiceResult<T> Conflict(string error) => new(false, 409, default, error);
}
