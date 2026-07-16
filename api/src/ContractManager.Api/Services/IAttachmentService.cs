using ContractManager.Api.Data;
using ContractManager.Api.Domain;
using ContractManager.Api.Dtos;
using ContractManager.Api.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;

namespace ContractManager.Api.Services;

public interface IAttachmentService
{
    Task<int?> CreateBatchAsync(int contractId, CancellationToken ct);
    Task<int?> CompleteBatchAsync(int batchId, CancellationToken ct);

    Task<UploadOutcome> UploadAsync(int contractId, int? batchId, Stream content, string fileName,
        string contentType, long? sizeHint, CancellationToken ct);

    Task<IReadOnlyList<AttachmentDto>?> ListAsync(int contractId, CancellationToken ct);
    Task<AttachmentDownload?> DownloadAsync(int attachmentId, CancellationToken ct);
    Task<bool?> DeleteAsync(int attachmentId, CancellationToken ct);
}

public record UploadOutcome(int AttachmentId, Guid AttachmentGuid);
public record AttachmentDownload(Stream Content, string FileName, string ContentType);

public class AttachmentService : IAttachmentService
{
    private readonly ContractManagerDbContext _db;
    private readonly IContractAccess _access;
    private readonly IActivityRecorder _activity;
    private readonly IAttachmentBlobStore _blobStore;
    private readonly AttachmentOptions _attachmentOptions;

    public AttachmentService(
        ContractManagerDbContext db,
        IContractAccess access,
        IActivityRecorder activity,
        IAttachmentBlobStore blobStore,
        IOptions<AttachmentOptions> attachmentOptions)
    {
        _db = db;
        _access = access;
        _activity = activity;
        _blobStore = blobStore;
        _attachmentOptions = attachmentOptions.Value;
    }

    public async Task<int?> CreateBatchAsync(int contractId, CancellationToken ct)
    {
        if (!await _access.CanEditAsync(contractId, ct).ConfigureAwait(false)) return null;
        var contract = await _db.Contracts.FindAsync(new object[] { contractId }, ct).ConfigureAwait(false);
        if (contract is null) return null;

        var batch = new ContractAttachmentBatch
        {
            ContractId = contractId,
            Status = BatchStatus.Pending,
            TotalAttachments = 0,
        };
        _db.ContractAttachmentBatches.Add(batch);
        await _db.SaveChangesAsync(ct).ConfigureAwait(false);
        return batch.BatchId;
    }

    public async Task<int?> CompleteBatchAsync(int batchId, CancellationToken ct)
    {
        var batch = await _db.ContractAttachmentBatches.FirstOrDefaultAsync(b => b.BatchId == batchId, ct).ConfigureAwait(false);
        if (batch is null) return null;
        if (!await _access.CanEditAsync(batch.ContractId, ct).ConfigureAwait(false)) return null;

        var count = await _db.ContractAttachments.CountAsync(a => a.BatchId == batchId, ct).ConfigureAwait(false);
        batch.TotalAttachments = count;
        batch.Status = BatchStatus.Complete;
        await _db.SaveChangesAsync(ct).ConfigureAwait(false);
        return count;
    }

    public async Task<UploadOutcome> UploadAsync(
        int contractId, int? batchId, Stream content, string fileName,
        string contentType, long? sizeHint, CancellationToken ct)
    {
        if (!await _access.CanEditAsync(contractId, ct).ConfigureAwait(false))
        {
            throw new UnauthorizedAccessException("Caller cannot upload attachments to this contract.");
        }
        var contract = await _db.Contracts.FindAsync(new object[] { contractId }, ct).ConfigureAwait(false)
            ?? throw new InvalidOperationException("Contract not found.");

        var safeName = Path.GetFileName(fileName);
        if (string.IsNullOrWhiteSpace(safeName) || safeName.Contains("..", StringComparison.Ordinal))
        {
            throw new InvalidOperationException("Invalid file name.");
        }
        if (_attachmentOptions.AllowedContentTypes.Length > 0
            && !_attachmentOptions.AllowedContentTypes.Contains(contentType, StringComparer.OrdinalIgnoreCase))
        {
            throw new InvalidOperationException($"Content type not allowed: {contentType}.");
        }
        if (sizeHint is long size && size > _attachmentOptions.MaxFileSizeBytes)
        {
            throw new InvalidOperationException($"File exceeds max size of {_attachmentOptions.MaxFileSizeBytes} bytes.");
        }

        var guid = Guid.NewGuid();
        var blobPath = $"{guid:N}/{safeName}";

        try
        {
            await _blobStore.UploadAsync(blobPath, content, contentType, ct).ConfigureAwait(false);
        }
        catch (Exception ex)
        {
            throw new BlobUploadFailedException("Blob upload failed.", ex);
        }

        try
        {
            var attachment = new ContractAttachment
            {
                AttachmentGuid = guid,
                ContractId = contractId,
                BatchId = batchId,
                BlobPath = blobPath,
                FileName = safeName,
                ContentType = contentType,
                SizeBytes = sizeHint ?? content.Length,
                Status = AttachmentStatus.Stored,
            };
            _db.ContractAttachments.Add(attachment);
            _activity.Record(contract, ActivityType.AttachmentAdded, $"Attached {safeName}");
            await _db.SaveChangesAsync(ct).ConfigureAwait(false);
            return new UploadOutcome(attachment.ContractAttachmentId, guid);
        }
        catch (Exception ex)
        {
            try { await _blobStore.DeleteIfExistsAsync(blobPath, ct).ConfigureAwait(false); }
            catch { /* best-effort cleanup */ }
            throw new SqlPersistFailedAfterBlobException("SQL persist failed after blob upload.", ex);
        }
    }

    public async Task<IReadOnlyList<AttachmentDto>?> ListAsync(int contractId, CancellationToken ct)
    {
        if (!await _access.CanAccessAsync(contractId, ct).ConfigureAwait(false)) return null;
        return await _db.ContractAttachments.AsNoTracking()
            .Where(a => a.ContractId == contractId)
            .OrderByDescending(a => a.CreatedAt)
            .Select(a => new AttachmentDto(
                a.ContractAttachmentId, a.AttachmentGuid, a.FileName, a.ContentType, a.SizeBytes, a.Status, a.CreatedAt))
            .ToListAsync(ct).ConfigureAwait(false);
    }

    public async Task<AttachmentDownload?> DownloadAsync(int attachmentId, CancellationToken ct)
    {
        var attachment = await _db.ContractAttachments
            .FirstOrDefaultAsync(a => a.ContractAttachmentId == attachmentId, ct).ConfigureAwait(false);
        if (attachment is null) return null;
        if (!await _access.CanAccessAsync(attachment.ContractId, ct).ConfigureAwait(false)) return null;

        var content = await _blobStore.DownloadAsync(attachment.BlobPath, ct).ConfigureAwait(false);
        return new AttachmentDownload(content, attachment.FileName, attachment.ContentType);
    }

    public async Task<bool?> DeleteAsync(int attachmentId, CancellationToken ct)
    {
        var attachment = await _db.ContractAttachments
            .FirstOrDefaultAsync(a => a.ContractAttachmentId == attachmentId, ct).ConfigureAwait(false);
        if (attachment is null) return false;
        if (!await _access.CanEditAsync(attachment.ContractId, ct).ConfigureAwait(false)) return null;

        _db.ContractAttachments.Remove(attachment);
        await _db.SaveChangesAsync(ct).ConfigureAwait(false);
        // Per ADR-009: leave the blob in place — soft-delete retains the SQL row reference.
        return true;
    }
}

public class BlobUploadFailedException : Exception
{
    public BlobUploadFailedException(string message, Exception inner) : base(message, inner) { }
}

public class SqlPersistFailedAfterBlobException : Exception
{
    public SqlPersistFailedAfterBlobException(string message, Exception inner) : base(message, inner) { }
}
