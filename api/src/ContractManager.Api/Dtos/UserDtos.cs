using ContractManager.Api.Domain;

namespace ContractManager.Api.Dtos;

public record CurrentUserResponse(
    Guid UserId,
    string DisplayName,
    string Email,
    string? Department,
    IReadOnlyList<string> Roles);

public record UserSummaryDto(Guid UserId, string DisplayName, string? Email);
