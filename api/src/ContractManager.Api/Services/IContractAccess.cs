using ContractManager.Api.Auth;
using ContractManager.Api.Data;
using ContractManager.Api.Domain;
using Microsoft.EntityFrameworkCore;

namespace ContractManager.Api.Services;

/// <summary>
/// Server-side record-level access checks per api-record-access.md.
/// Procurement → all contracts. Requester → own contracts (RequesterUserId match).
/// AttorneyReviewer → contracts where they are in the ContractAssignment join table.
/// Composes as OR; ownership violations return false from CanAccess (controller returns 403).
/// </summary>
public interface IContractAccess
{
    IQueryable<Contract> ApplyListFilter(IQueryable<Contract> query);
    Task<bool> CanAccessAsync(int contractId, CancellationToken cancellationToken);
    Task<bool> CanEditAsync(int contractId, CancellationToken cancellationToken);
    bool CanSeeInternalOnlyComments();
    bool CanSeeNotesTab();
}

public class ContractAccess : IContractAccess
{
    private readonly ContractManagerDbContext _db;
    private readonly IUserContext _userContext;

    public ContractAccess(ContractManagerDbContext db, IUserContext userContext)
    {
        _db = db;
        _userContext = userContext;
    }

    public IQueryable<Contract> ApplyListFilter(IQueryable<Contract> query)
    {
        if (_userContext.IsInRole(AppRoles.Procurement))
        {
            return query;
        }

        var userId = _userContext.UserId;
        if (userId is null) return query.Where(c => false);

        var oid = userId.Value;
        var isReviewer = _userContext.IsInRole(AppRoles.AttorneyReviewer);
        var isRequester = _userContext.IsInRole(AppRoles.Requester);

        return query.Where(c =>
            (isRequester && c.RequesterUserId == oid)
            || (isReviewer && c.Assignments.Any(a => a.ReviewerUserId == oid)));
    }

    public async Task<bool> CanAccessAsync(int contractId, CancellationToken cancellationToken)
    {
        return await ApplyListFilter(_db.Contracts.AsNoTracking())
            .AnyAsync(c => c.ContractId == contractId, cancellationToken).ConfigureAwait(false);
    }

    public Task<bool> CanEditAsync(int contractId, CancellationToken cancellationToken)
    {
        // Only Procurement can edit fields / change status / reassign.
        return Task.FromResult(_userContext.IsInRole(AppRoles.Procurement));
    }

    public bool CanSeeInternalOnlyComments() =>
        _userContext.IsInRole(AppRoles.Procurement) || _userContext.IsInRole(AppRoles.AttorneyReviewer);

    public bool CanSeeNotesTab() =>
        _userContext.IsInRole(AppRoles.Procurement) || _userContext.IsInRole(AppRoles.AttorneyReviewer);
}
