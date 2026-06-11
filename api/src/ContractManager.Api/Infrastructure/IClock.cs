namespace ContractManager.Api.Infrastructure;

/// <summary>Injectable clock so services and tests can advance time deterministically.</summary>
public interface IClock
{
    DateTime UtcNow { get; }
}

public class SystemClock : IClock
{
    public DateTime UtcNow => DateTime.UtcNow;
}
