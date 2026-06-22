using System.ComponentModel.DataAnnotations;
using ContractManager.Api.Domain;

namespace ContractManager.Api.Dtos;

/// <summary>
/// Bulk-upload preview/commit DTOs. The four flows (file drop, paste, type, manual entry)
/// converge on the same JSON row shape — server is stateless between preview and commit
/// (ADR-011), so the client holds the working state and posts resolved rows back.
/// </summary>
public record BulkUploadPreviewRow(
    int Index,
    string? ContractNumber,
    string? Title,
    Category? Category,
    string? VendorName,
    int? MatchedVendorId,
    Priority? Priority,
    Guid? ProcurementOwnerUserId,
    string? RequesterName,
    string? RequesterEmail,
    decimal? TotalCostUsd,
    DateTime? TermStartDate,
    DateTime? TermEndDate,
    DateTime? SubmittedDate,
    string? LegacyStatus,
    bool IsValid,
    bool IsSkipped,
    IReadOnlyList<BulkRowError> Errors);

public record BulkRowError(string FieldKey, string Message);

public record BulkUploadPreviewDto(
    IReadOnlyList<BulkUploadPreviewRow> Rows,
    int ValidCount,
    int FlaggedCount,
    int VendorDuplicateMatches);

public class BulkUploadPreviewRequest
{
    /// <summary>Source flow — file_drop | paste | type | manual.</summary>
    [Required] public string Flow { get; set; } = string.Empty;

    public IReadOnlyList<BulkUploadInputRow>? Rows { get; set; }
}

/// <summary>Raw row from the client — accepts strings everywhere so per-cell errors can flag malformed values.</summary>
public class BulkUploadInputRow
{
    public int Index { get; set; }
    public string? ContractNumber { get; set; }
    public string? Title { get; set; }
    public string? Category { get; set; }
    public string? VendorName { get; set; }
    public string? Priority { get; set; }
    public string? ProcurementOwnerName { get; set; }
    public string? RequesterName { get; set; }
    public string? RequesterEmail { get; set; }
    public string? TotalCost { get; set; }
    public string? TermStartDate { get; set; }
    public string? TermEndDate { get; set; }
    public string? SubmittedDate { get; set; }
    public string? LegacyStatus { get; set; }
    public bool IsSkipped { get; set; }
}

public class BulkUploadCommitRequest
{
    [Required] public IReadOnlyList<BulkUploadPreviewRow> Rows { get; set; } = Array.Empty<BulkUploadPreviewRow>();
}

public record BulkUploadCommitResult(
    int ImportedCount,
    int FailedCount,
    int SkippedCount,
    IReadOnlyList<BulkCommitFailure> Failures);

public record BulkCommitFailure(int Index, string? ContractNumber, string Message);
