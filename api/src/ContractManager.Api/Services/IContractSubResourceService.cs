using ContractManager.Api.Auth;
using ContractManager.Api.Data;
using ContractManager.Api.Domain;
using ContractManager.Api.Dtos;
using ContractManager.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace ContractManager.Api.Services;

/// <summary>
/// Per-contract sub-resource operations: comments, notes, activity, notifications, assignments.
/// All paths verify access through IContractAccess first.
/// </summary>
public interface IContractSubResourceService
{
    Task<IReadOnlyList<CommentDto>?> ListCommentsAsync(int contractId, CancellationToken ct);
    Task<CommentDto?> AddCommentAsync(int contractId, CreateCommentRequest request, CancellationToken ct);

    Task<IReadOnlyList<NoteDto>?> ListNotesAsync(int contractId, CancellationToken ct);
    Task<NoteDto?> AddNoteAsync(int contractId, CreateNoteRequest request, CancellationToken ct);
    Task<bool?> DeleteNoteAsync(int contractId, int noteId, CancellationToken ct);

    Task<IReadOnlyList<ActivityEventDto>?> ListActivityAsync(int contractId, CancellationToken ct);
    Task<IReadOnlyList<NotificationDto>?> ListNotificationsAsync(int contractId, CancellationToken ct);

    Task<IReadOnlyList<AssignmentDto>?> ListAssignmentsAsync(int contractId, CancellationToken ct);
    Task<AssignmentDto?> AddAssignmentAsync(int contractId, CreateAssignmentRequest request, CancellationToken ct);
    Task<bool?> RemoveAssignmentAsync(int contractId, int assignmentId, CancellationToken ct);
}

public class ContractSubResourceService : IContractSubResourceService
{
    private readonly ContractManagerDbContext _db;
    private readonly IContractAccess _access;
    private readonly IUserContext _userContext;
    private readonly IActivityRecorder _activity;
    private readonly IClock _clock;

    public ContractSubResourceService(
        ContractManagerDbContext db, IContractAccess access, IUserContext userContext,
        IActivityRecorder activity, IClock clock)
    {
        _db = db;
        _access = access;
        _userContext = userContext;
        _activity = activity;
        _clock = clock;
    }

    public async Task<IReadOnlyList<CommentDto>?> ListCommentsAsync(int contractId, CancellationToken ct)
    {
        if (!await _access.CanAccessAsync(contractId, ct).ConfigureAwait(false)) return null;
        var includeInternal = _access.CanSeeInternalOnlyComments();
        return await _db.ContractComments.AsNoTracking()
            .Where(c => c.ContractId == contractId && (includeInternal || !c.IsInternalOnly))
            .OrderBy(c => c.CreatedAt)
            .Select(c => new CommentDto(
                c.ContractCommentId, c.AuthorUserId,
                c.Author == null ? string.Empty : c.Author.DisplayName,
                c.AuthorRoleSnapshot, c.Text, c.IsInternalOnly, c.CreatedAt))
            .ToListAsync(ct).ConfigureAwait(false);
    }

    public async Task<CommentDto?> AddCommentAsync(int contractId, CreateCommentRequest request, CancellationToken ct)
    {
        if (!await _access.CanAccessAsync(contractId, ct).ConfigureAwait(false)) return null;
        var contract = await _db.Contracts.FindAsync(new object[] { contractId }, ct).ConfigureAwait(false);
        if (contract is null) return null;

        var authorId = _userContext.UserId ?? Guid.Empty;
        var isInternalOnly = request.IsInternalOnly && _access.CanSeeInternalOnlyComments();

        var comment = new ContractComment
        {
            ContractId = contractId,
            AuthorUserId = authorId,
            AuthorRoleSnapshot = ResolveRoleSnapshot(),
            Text = request.Text,
            IsInternalOnly = isInternalOnly,
        };
        _db.ContractComments.Add(comment);
        _activity.Record(contract, ActivityType.CommentAdded, "Comment added");
        await _db.SaveChangesAsync(ct).ConfigureAwait(false);

        await _db.Entry(comment).Reference(c => c.Author).LoadAsync(ct).ConfigureAwait(false);
        return new CommentDto(comment.ContractCommentId, comment.AuthorUserId,
            comment.Author?.DisplayName ?? string.Empty, comment.AuthorRoleSnapshot,
            comment.Text, comment.IsInternalOnly, comment.CreatedAt);
    }

    public async Task<IReadOnlyList<NoteDto>?> ListNotesAsync(int contractId, CancellationToken ct)
    {
        if (!await _access.CanAccessAsync(contractId, ct).ConfigureAwait(false)) return null;
        if (!_access.CanSeeNotesTab()) return Array.Empty<NoteDto>();
        return await _db.ContractNotes.AsNoTracking()
            .Where(n => n.ContractId == contractId)
            .OrderByDescending(n => n.NoteDate)
            .Select(n => new NoteDto(
                n.ContractNoteId, n.AuthorUserId,
                n.Author == null ? string.Empty : n.Author.DisplayName,
                n.Type, n.NoteDate, n.Participants, n.Text, n.CreatedAt))
            .ToListAsync(ct).ConfigureAwait(false);
    }

    public async Task<NoteDto?> AddNoteAsync(int contractId, CreateNoteRequest request, CancellationToken ct)
    {
        if (!await _access.CanAccessAsync(contractId, ct).ConfigureAwait(false)) return null;
        if (!_access.CanSeeNotesTab()) return null;

        var contract = await _db.Contracts.FindAsync(new object[] { contractId }, ct).ConfigureAwait(false);
        if (contract is null) return null;

        var authorId = _userContext.UserId ?? Guid.Empty;
        var note = new ContractNote
        {
            ContractId = contractId,
            AuthorUserId = authorId,
            Type = request.Type,
            NoteDate = request.Date,
            Participants = request.Participants,
            Text = request.Text,
        };
        _db.ContractNotes.Add(note);
        _activity.Record(contract, ActivityType.NoteAdded, $"{request.Type} note logged");
        await _db.SaveChangesAsync(ct).ConfigureAwait(false);

        await _db.Entry(note).Reference(n => n.Author).LoadAsync(ct).ConfigureAwait(false);
        return new NoteDto(note.ContractNoteId, note.AuthorUserId,
            note.Author?.DisplayName ?? string.Empty, note.Type, note.NoteDate,
            note.Participants, note.Text, note.CreatedAt);
    }

    public async Task<bool?> DeleteNoteAsync(int contractId, int noteId, CancellationToken ct)
    {
        if (!await _access.CanAccessAsync(contractId, ct).ConfigureAwait(false)) return null;
        var actorId = _userContext.UserId;
        var note = await _db.ContractNotes.FirstOrDefaultAsync(n => n.ContractId == contractId && n.ContractNoteId == noteId, ct)
            .ConfigureAwait(false);
        if (note is null) return false;
        // Only the author can delete their own note.
        if (note.AuthorUserId != actorId) return null;

        _db.ContractNotes.Remove(note);
        await _db.SaveChangesAsync(ct).ConfigureAwait(false);
        return true;
    }

    public async Task<IReadOnlyList<ActivityEventDto>?> ListActivityAsync(int contractId, CancellationToken ct)
    {
        if (!await _access.CanAccessAsync(contractId, ct).ConfigureAwait(false)) return null;
        return await _db.ActivityEvents.AsNoTracking()
            .Where(e => e.ContractId == contractId)
            .OrderByDescending(e => e.OccurredAt)
            .Select(e => new ActivityEventDto(
                e.ActivityEventId, e.ActorUserId,
                e.Actor == null ? string.Empty : e.Actor.DisplayName,
                e.Type, e.DescriptionLine, e.OccurredAt))
            .ToListAsync(ct).ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<NotificationDto>?> ListNotificationsAsync(int contractId, CancellationToken ct)
    {
        if (!await _access.CanAccessAsync(contractId, ct).ConfigureAwait(false)) return null;
        if (!_userContext.IsInRole(AppRoles.Procurement)) return null;
        return await _db.NotificationLogs.AsNoTracking()
            .Where(n => n.ContractId == contractId)
            .OrderByDescending(n => n.SentAt)
            .Select(n => new NotificationDto(
                n.NotificationLogId, n.Channel, n.Subject, n.Status, n.FailureReason, n.SentAt))
            .ToListAsync(ct).ConfigureAwait(false);
    }

    public async Task<IReadOnlyList<AssignmentDto>?> ListAssignmentsAsync(int contractId, CancellationToken ct)
    {
        if (!await _access.CanAccessAsync(contractId, ct).ConfigureAwait(false)) return null;
        if (_userContext.IsInRole(AppRoles.Requester)
            && !_userContext.IsInRole(AppRoles.Procurement)
            && !_userContext.IsInRole(AppRoles.AttorneyReviewer))
        {
            return null;
        }
        return await _db.ContractAssignments.AsNoTracking()
            .Where(a => a.ContractId == contractId)
            .Select(a => new AssignmentDto(
                a.ContractAssignmentId, a.ReviewerUserId,
                a.Reviewer == null ? string.Empty : a.Reviewer.DisplayName,
                a.ReviewerTeam, a.AssignedAt))
            .ToListAsync(ct).ConfigureAwait(false);
    }

    public async Task<AssignmentDto?> AddAssignmentAsync(int contractId, CreateAssignmentRequest request, CancellationToken ct)
    {
        if (!_userContext.IsInRole(AppRoles.Procurement)) return null;
        var contract = await _db.Contracts.FindAsync(new object[] { contractId }, ct).ConfigureAwait(false);
        if (contract is null) return null;

        var existing = await _db.ContractAssignments.AsNoTracking()
            .AnyAsync(a => a.ContractId == contractId && a.ReviewerUserId == request.ReviewerUserId, ct)
            .ConfigureAwait(false);
        if (existing) throw new InvalidOperationException("Reviewer is already assigned to this contract");

        var assignedBy = _userContext.UserId ?? Guid.Empty;
        var now = _clock.UtcNow;
        var assignment = new ContractAssignment
        {
            ContractId = contractId,
            ReviewerUserId = request.ReviewerUserId,
            ReviewerTeam = request.Team,
            AssignedAt = now,
            AssignedByUserId = assignedBy,
        };
        _db.ContractAssignments.Add(assignment);
        _activity.Record(contract, ActivityType.AssignmentChanged, $"{request.Team} reviewer added");
        await _db.SaveChangesAsync(ct).ConfigureAwait(false);

        await _db.Entry(assignment).Reference(a => a.Reviewer).LoadAsync(ct).ConfigureAwait(false);
        return new AssignmentDto(assignment.ContractAssignmentId, assignment.ReviewerUserId,
            assignment.Reviewer?.DisplayName ?? string.Empty, assignment.ReviewerTeam, assignment.AssignedAt);
    }

    public async Task<bool?> RemoveAssignmentAsync(int contractId, int assignmentId, CancellationToken ct)
    {
        if (!_userContext.IsInRole(AppRoles.Procurement)) return null;
        var contract = await _db.Contracts.FindAsync(new object[] { contractId }, ct).ConfigureAwait(false);
        if (contract is null) return null;
        var assignment = await _db.ContractAssignments
            .FirstOrDefaultAsync(a => a.ContractId == contractId && a.ContractAssignmentId == assignmentId, ct)
            .ConfigureAwait(false);
        if (assignment is null) return false;

        _db.ContractAssignments.Remove(assignment);
        _activity.Record(contract, ActivityType.AssignmentChanged, "Reviewer removed");
        await _db.SaveChangesAsync(ct).ConfigureAwait(false);
        return true;
    }

    private string ResolveRoleSnapshot()
    {
        if (_userContext.IsInRole(AppRoles.Procurement)) return AppRoles.Procurement;
        if (_userContext.IsInRole(AppRoles.AttorneyReviewer)) return AppRoles.AttorneyReviewer;
        return AppRoles.Requester;
    }
}
