using ContractManager.Api.Domain;

namespace ContractManager.Api.Dtos;

/// <summary>
/// Reports KPIs per plan.md §3.11 / §4 S13. "Active" = contracts with ≥1 lane in
/// {InReview, Waiting} (plan.md §2.13). "My" variants scope to the signed-in Procurement owner.
/// </summary>
public record ReportsKpiDto(
    int ContractsReviewedYtdAll,
    int MyReviewedYtd,
    string MyOwnerName,
    int ActiveRightNow,
    int MyActive,
    int CompletedYtd,
    int CanceledYtd);

public record CategoryBarDto(Category Category, int Count);

public record OwnerBarDto(Guid OwnerUserId, string OwnerName, int Count);
