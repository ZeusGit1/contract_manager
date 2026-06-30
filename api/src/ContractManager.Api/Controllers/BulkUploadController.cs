using System.Globalization;
using ClosedXML.Excel;
using ContractManager.Api.Auth;
using ContractManager.Api.Domain;
using ContractManager.Api.Dtos;
using ContractManager.Api.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace ContractManager.Api.Controllers;

/// <summary>
/// Bulk-upload preview + commit. Procurement-only. Four flows (file drop, paste, type, manual)
/// converge on the same JSON row shape per ADR-011 / plan.md §3.10. Preview accepts the
/// uploaded .xlsx as multipart/form-data, parses it server-side (per ADR-011), then runs the
/// shared validation pipeline.
/// </summary>
[ApiController]
[Authorize(Roles = AppRoles.Procurement + "," + AppRoles.ProcurementAdmin)]
[Route("api/bulk-upload")]
public class BulkUploadController : ControllerBase
{
    private const long MaxUploadBytes = 10 * 1024 * 1024;

    private static readonly Dictionary<string, Action<BulkUploadInputRow, string>> ColumnMappers =
        new(StringComparer.OrdinalIgnoreCase)
        {
            ["ContractId"] = (row, value) => row.ContractNumber = value,
            ["ContractNumber"] = (row, value) => row.ContractNumber = value,
            ["ContractName"] = (row, value) => row.Title = value,
            ["Title"] = (row, value) => row.Title = value,
            ["Category"] = (row, value) => row.Category = value,
            ["Status"] = (row, value) => row.LegacyStatus = value,
            ["LegacyStatus"] = (row, value) => row.LegacyStatus = value,
            ["RequesterName"] = (row, value) => row.RequesterName = value,
            ["RequesterEmail"] = (row, value) => row.RequesterEmail = value,
            ["VendorName"] = (row, value) => row.VendorName = value,
            ["AssignedReviewer"] = (row, value) => row.ProcurementOwnerName = value,
            ["ProcurementOwnerName"] = (row, value) => row.ProcurementOwnerName = value,
            ["Priority"] = (row, value) => row.Priority = value,
            ["TotalCost"] = (row, value) => row.TotalCost = value,
            ["SubmittedDate"] = (row, value) => row.SubmittedDate = value,
            ["TermStartDate"] = (row, value) => row.TermStartDate = value,
            ["TermEndDate"] = (row, value) => row.TermEndDate = value,
        };

    private readonly IBulkUploadService _service;
    private readonly ILogger<BulkUploadController> _logger;

    public BulkUploadController(IBulkUploadService service, ILogger<BulkUploadController> logger)
    {
        _service = service;
        _logger = logger;
    }

    [HttpPost("preview")]
    [Consumes("multipart/form-data")]
    public async Task<ActionResult<BulkUploadPreviewWebDto>> Preview(
        IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
            return ValidationProblem("Upload a spreadsheet to preview.");
        if (file.Length > MaxUploadBytes)
            return ValidationProblem("This spreadsheet is over 10MB. Split it into smaller files and try again.");
        if (!file.FileName.EndsWith(".xlsx", StringComparison.OrdinalIgnoreCase))
            return ValidationProblem("Only .xlsx spreadsheets are supported.");

        List<BulkUploadInputRow> inputs;
        try
        {
            await using var stream = file.OpenReadStream();
            inputs = ParseSpreadsheet(stream);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Bulk upload spreadsheet parse failed (size {SizeBytes}).", file.Length);
            return ValidationProblem("Couldn't read the spreadsheet. Check that the first row contains column headers (ContractName, Category, VendorName, etc.) and the file isn't corrupted.");
        }

        if (inputs.Count == 0)
            return ValidationProblem("The spreadsheet has no data rows below the header row.");

        var request = new BulkUploadPreviewRequest { Flow = "file_drop", Rows = inputs };
        var preview = await _service.PreviewAsync(request, cancellationToken).ConfigureAwait(false);
        return Ok(ToWebDto(preview));
    }

    [HttpPost("commit")]
    public async Task<ActionResult<BulkUploadCommitWebResponse>> Commit(
        [FromBody] BulkUploadCommitWebRequest request, CancellationToken cancellationToken)
    {
        if (!ModelState.IsValid) return ValidationProblem(ModelState);

        var rows = new List<BulkUploadPreviewRow>(request.Rows.Count);
        foreach (var row in request.Rows)
        {
            if (!TryMapToPreviewRow(row, out var mapped, out var error))
                return ValidationProblem(error);
            rows.Add(mapped);
        }

        var serviceRequest = new BulkUploadCommitRequest { Rows = rows };
        var result = await _service.CommitAsync(serviceRequest, cancellationToken).ConfigureAwait(false);
        return Ok(new BulkUploadCommitWebResponse(
            ImportedCount: result.ImportedCount,
            SkippedCount: result.SkippedCount,
            FailedCount: result.FailedCount,
            CreatedContractIds: Array.Empty<int>(),
            Failures: result.Failures));
    }

    private static List<BulkUploadInputRow> ParseSpreadsheet(Stream stream)
    {
        using var workbook = new XLWorkbook(stream);
        var sheet = workbook.Worksheets.First();
        var range = sheet.RangeUsed();
        if (range is null) return new List<BulkUploadInputRow>();

        var headerRow = range.FirstRow();
        var headers = new Dictionary<int, string>();
        foreach (var cell in headerRow.Cells())
        {
            var header = cell.GetString().Trim();
            if (!string.IsNullOrEmpty(header))
                headers[cell.Address.ColumnNumber] = header;
        }

        var rows = new List<BulkUploadInputRow>();
        var dataRows = range.RowsUsed().Skip(1);
        var index = 0;
        foreach (var dataRow in dataRows)
        {
            var input = new BulkUploadInputRow { Index = index++ };
            var hasAny = false;
            foreach (var (columnNumber, header) in headers)
            {
                if (!ColumnMappers.TryGetValue(header, out var assign)) continue;
                var cell = dataRow.Cell(columnNumber);
                var raw = ReadCellAsString(cell);
                if (string.IsNullOrWhiteSpace(raw)) continue;
                assign(input, raw.Trim());
                hasAny = true;
            }
            if (hasAny) rows.Add(input);
        }
        return rows;
    }

    private static string ReadCellAsString(IXLCell cell)
    {
        if (cell.IsEmpty()) return string.Empty;
        return cell.DataType switch
        {
            XLDataType.DateTime => cell.GetDateTime().ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            XLDataType.Number => cell.GetDouble().ToString("R", CultureInfo.InvariantCulture),
            XLDataType.Boolean => cell.GetBoolean().ToString(),
            _ => cell.GetString(),
        };
    }

    private static BulkUploadPreviewWebDto ToWebDto(BulkUploadPreviewDto preview)
    {
        var rows = preview.Rows.Select(row => new BulkUploadRowWebDto(
            RowNumber: row.Index + 1,
            ContractNumber: row.ContractNumber,
            ContractTitle: row.Title,
            VendorName: row.VendorName,
            MatchedVendorId: row.MatchedVendorId,
            Category: row.Category?.ToString(),
            Priority: row.Priority?.ToString(),
            ProcurementOwnerUserId: row.ProcurementOwnerUserId,
            RequesterName: row.RequesterName,
            RequesterEmail: row.RequesterEmail,
            TotalCost: row.TotalCostUsd,
            TermStartDate: row.TermStartDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            TermEndDate: row.TermEndDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            SubmittedDate: row.SubmittedDate?.ToString("yyyy-MM-dd", CultureInfo.InvariantCulture),
            LegacyStatus: row.LegacyStatus,
            IsValid: row.IsValid,
            Errors: row.Errors.Select(error => error.Message).ToList())).ToList();

        return new BulkUploadPreviewWebDto(
            TotalRows: rows.Count,
            ValidRows: preview.ValidCount,
            InvalidRows: preview.FlaggedCount,
            Rows: rows);
    }

    private static bool TryMapToPreviewRow(BulkUploadRowWebDto webRow, out BulkUploadPreviewRow rich, out string error)
    {
        error = string.Empty;
        Category? category = null;
        if (!string.IsNullOrWhiteSpace(webRow.Category))
        {
            if (!Enum.TryParse<Category>(webRow.Category, ignoreCase: true, out var parsed))
            {
                rich = null!;
                error = $"Row {webRow.RowNumber}: unknown category '{webRow.Category}'.";
                return false;
            }
            category = parsed;
        }

        Priority? priority = null;
        if (!string.IsNullOrWhiteSpace(webRow.Priority))
        {
            if (!Enum.TryParse<Priority>(webRow.Priority, ignoreCase: true, out var parsed))
            {
                rich = null!;
                error = $"Row {webRow.RowNumber}: unknown priority '{webRow.Priority}'.";
                return false;
            }
            priority = parsed;
        }

        rich = new BulkUploadPreviewRow(
            Index: webRow.RowNumber - 1,
            ContractNumber: webRow.ContractNumber,
            Title: webRow.ContractTitle,
            Category: category,
            VendorName: webRow.VendorName,
            MatchedVendorId: webRow.MatchedVendorId,
            Priority: priority,
            ProcurementOwnerUserId: webRow.ProcurementOwnerUserId,
            RequesterName: webRow.RequesterName,
            RequesterEmail: webRow.RequesterEmail,
            TotalCostUsd: webRow.TotalCost,
            TermStartDate: ParseOptionalDate(webRow.TermStartDate),
            TermEndDate: ParseOptionalDate(webRow.TermEndDate),
            SubmittedDate: ParseOptionalDate(webRow.SubmittedDate),
            LegacyStatus: webRow.LegacyStatus,
            IsValid: webRow.IsValid,
            IsSkipped: false,
            Errors: Array.Empty<BulkRowError>());
        return true;
    }

    private static DateTime? ParseOptionalDate(string? raw)
    {
        if (string.IsNullOrWhiteSpace(raw)) return null;
        if (DateTime.TryParse(raw, CultureInfo.InvariantCulture, DateTimeStyles.AssumeUniversal | DateTimeStyles.AdjustToUniversal, out var parsed))
            return parsed;
        if (DateTime.TryParse(raw, out parsed))
            return parsed.ToUniversalTime();
        return null;
    }
}
