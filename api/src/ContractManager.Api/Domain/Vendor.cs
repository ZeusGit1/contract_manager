namespace ContractManager.Api.Domain;

public class Vendor : AuditEntity
{
    public int VendorId { get; set; }
    public string? VendorCode { get; set; }
    public string Name { get; set; } = string.Empty;
    public VendorType Type { get; set; }
    public PreferredStatus PreferredStatus { get; set; }
    public string? PrimaryContactName { get; set; }
    public string? PrimaryContactEmail { get; set; }
    public string? PrimaryContactPhone { get; set; }
    public string? PrimaryContactRole { get; set; }
    public string? Location { get; set; }
    public string? VendorSinceText { get; set; }
    public string? Notes { get; set; }

    public ICollection<Contract> Contracts { get; set; } = new List<Contract>();
}
