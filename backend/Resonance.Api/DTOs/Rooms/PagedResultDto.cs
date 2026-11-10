namespace Resonance.DTOs.Rooms
{
    public record PagedResultDto<T>(
        IEnumerable<T> Items,
        int TotalItems,
        int Page,
        int PageSize,
        int TotalPages
    );
}
