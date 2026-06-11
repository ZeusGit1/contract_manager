using ClosedXML.Excel;
using ContractManager.Api.Data;
using ContractManager.Api.Domain;
using ContractManager.Api.Dtos;
using ContractManager.Api.Infrastructure;
using Microsoft.EntityFrameworkCore;

namespace ContractManager.Api.Services;

public interface IBulkUploadService
{
    Task<BulkUploadPreviewDto> PreviewAsync(Stream xlsx, CancellationToken cancellationToken);
    Task<BulkUploadCommitResponse> CommitAsync(BulkUploadCommitRequest request, CancellationToken cancellationToken);
}

public class BulkUploadService : IBulkUploadService
{
    private static readonly string[] RequiredHeaders =
    {
        "ContractName", "Category", "VendorName", "TotalCost", "TermStartDate", "TermEndDate",
    };

    private readonly ContractManagerDbContext _db;
    private readonly IContractNumberGenerator _numberGenerator;
    private readonly IUserContext _userContext;
    private readonly IClock _clock;
    private readonly IActivityRecorder _activity;

    public BulkUploadService(
        ContractManagerDbContext db,
        IContractNumberGenerator numberGenerator,
        IUserContext userContext,
        IClock clock,
        IActivityRecorder activity)
    {
        _db = db;
        _numberGenerator = numberGenerator;
        _userContext = userContext;
        _clock = clock;
        _activity = activity;
    }

    public async Task<BulkUploadPreviewDto> PreviewAsync(Stream xlsx, CancellationToken cancellationToken)
    {
        using var workbook = new XLWorkbook(xlsx);
        var worksheet = workbook.Worksheets.FirstOrDefault()
            ?? throw new InvalidOperationException("Workbook has no worksheets");

        var headerRow = worksheet.FirstRowUsed()
            ?? throw new InvalidOperationException("Worksheet has no header row");
        var headers = headerRow.Cells().Select(cell => cell.GetString().Trim()).ToList();
        foreach (var required in RequiredHeaders)
        {
            if (!headers.Contains(required, StringComparer.OrdinalIgnoreCase))
            {
                throw new InvalidOperationException($"Missing required column: {required}");
            }
        }

        var vendorNames = new HashSet<string>(
            await _db.Vendors.Select(v => v.Name).ToListAsync(cancellationToken).ConfigureAwait(false),
            StringComparer.OrdinalIgnoreCase);

        var rows = new List<BulkUploadRowDto>();
        var dataRows = worksheet.RangeUsed()?.RowsUsed().Skip(1) ?? Enumerable.Empty<IXLRangeRow>();
        var rowNumber = 1;
        foreach (var dataRow in dataRows)
        {
            rowNumber++;
            var errors = new List<string>();
            string? Read(string header) =>
                headers.FindIndex(name => name.Equals(header, StringComparison.OrdinalIgnoreCase)) is int idx and >= 0
                    ? dataRow.Cell(idx + 1).GetString().Trim()
                    : null;

            var title = Read("ContractName");
            var categoryText = Read("Category");
            var vendorName = Read("VendorName");
            var costText = Read("TotalCost");
            var termStartText = Read("TermStartDate");
            var termEndText = Read("TermEndDate");

            if (string.IsNullOrWhiteSpace(title)) errors.Add("Missing title");
            if (string.IsNullOrWhiteSpace(vendorName)) errors.Add("Missing vendor");
            else if (!vendorNames.Contains(vendorName)) errors.Add("Unknown vendor");

            Category? category = null;
            if (string.IsNullOrWhiteSpace(categoryText) || !Enum.TryParse(categoryText, true, out Category parsedCategory))
            {
                errors.Add("Unknown category");
            }
            else
            {
                category = parsedCategory;
            }

            decimal? cost = null;
            if (!string.IsNullOrWhiteSpace(costText))
            {
                var cleaned = new string(costText.Where(ch => char.IsDigit(ch) || ch == '.' || ch == '-').ToArray());
                if (decimal.TryParse(cleaned, out var parsedCost) && parsedCost > 0)
                {
                    cost = parsedCost;
                }
                else
                {
                    errors.Add("Invalid amount");
                }
            }

            DateTime? termStart = TryParseDate(termStartText, errors, "Term start");
            DateTime? termEnd = TryParseDate(termEndText, errors, "Term end");
            if (termStart is DateTime start && termEnd is DateTime end && end < start)
            {
                errors.Add("Ends before start");
            }

            rows.Add(new BulkUploadRowDto(
                rowNumber, title, vendorName, categoryText,
                cost, termStart, termEnd, errors));
        }

        var valid = rows.Count(r => r.Errors.Count == 0);
        return new BulkUploadPreviewDto(rows.Count, valid, rows.Count - valid, rows);
    }

    public async Task<BulkUploadCommitResponse> CommitAsync(BulkUploadCommitRequest request, CancellationToken cancellationToken)
    {
        var requesterId = _userContext.UserId
            ?? throw new InvalidOperationException("Authenticated requester required");
        var vendorLookup = await _db.Vendors
            .Select(v => new { v.VendorId, v.Name })
            .ToListAsync(cancellationToken).ConfigureAwait(false);
        var vendorIndex = vendorLookup.ToDictionary(v => v.Name, v => v.VendorId, StringComparer.OrdinalIgnoreCase);

        var now = _clock.UtcNow;
        var imported = new List<int>();
        var skipped = 0;
        foreach (var row in request.Rows)
        {
            if (row.Errors.Count > 0) { skipped++; continue; }
            if (string.IsNullOrWhiteSpace(row.ContractTitle)
                || string.IsNullOrWhiteSpace(row.VendorName)
                || !vendorIndex.TryGetValue(row.VendorName!, out var vendorId)
                || string.IsNullOrWhiteSpace(row.Category)
                || !Enum.TryParse<Category>(row.Category, true, out var category))
            {
                skipped++;
                continue;
            }

            var contract = new Contract
            {
                ContractNumber = await _numberGenerator.NextAsync(cancellationToken).ConfigureAwait(false),
                Title = row.ContractTitle!,
                Category = category,
                Status = ContractStatus.InProcess,
                VendorId = vendorId,
                RequesterUserId = requesterId,
                TotalCostUsd = row.TotalCost,
                SubmittedAt = now,
                TermStartDate = row.TermStartDate,
                TermEndDate = row.TermEndDate,
                LastActionAt = now,
            };
            _db.Contracts.Add(contract);
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            _activity.Record(contract, ActivityType.BulkImported, $"Imported via bulk upload — row {row.RowNumber}");
            await _db.SaveChangesAsync(cancellationToken).ConfigureAwait(false);
            imported.Add(contract.ContractId);
        }
        return new BulkUploadCommitResponse(imported.Count, skipped, imported);
    }

    private static DateTime? TryParseDate(string? value, List<string> errors, string field)
    {
        if (string.IsNullOrWhiteSpace(value)) { errors.Add($"Missing {field.ToLower()} date"); return null; }
        if (DateTime.TryParse(value, out var parsed)) return parsed;
        errors.Add($"Invalid {field.ToLower()} date");
        return null;
    }
}
