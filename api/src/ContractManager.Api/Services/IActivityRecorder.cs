using ContractManager.Api.Data;
using ContractManager.Api.Domain;
using ContractManager.Api.Infrastructure;

namespace ContractManager.Api.Services;

/// <summary>Records ActivityEvent rows when contracts mutate. Also stamps Contract.LastActionAt.</summary>
public interface IActivityRecorder
{
    void Record(Contract contract, ActivityType type, string descriptionLine, string? structuredJson = null);
}

public class ActivityRecorder : IActivityRecorder
{
    private readonly ContractManagerDbContext _db;
    private readonly IUserContext _userContext;
    private readonly IClock _clock;

    public ActivityRecorder(ContractManagerDbContext db, IUserContext userContext, IClock clock)
    {
        _db = db;
        _userContext = userContext;
        _clock = clock;
    }

    public void Record(Contract contract, ActivityType type, string descriptionLine, string? structuredJson = null)
    {
        var actor = _userContext.UserId ?? Guid.Empty;
        var now = _clock.UtcNow;

        _db.ActivityEvents.Add(new ActivityEvent
        {
            Contract = contract,
            ActorUserId = actor,
            Type = type,
            DescriptionLine = descriptionLine,
            StructuredJson = structuredJson,
            OccurredAt = now,
        });

        contract.LastActionAt = now;
    }
}
