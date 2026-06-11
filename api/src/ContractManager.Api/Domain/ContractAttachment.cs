namespace ContractManager.Api.Domain;

public class ContractAttachment : AuditEntity
{
    public int ContractAttachmentId { get; set; }
    public Guid AttachmentGuid { get; set; }
    public int ContractId { get; set; }
    public Contract? Contract { get; set; }
    public int? BatchId { get; set; }
    public ContractAttachmentBatch? Batch { get; set; }
    public string BlobPath { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long SizeBytes { get; set; }
    public AttachmentStatus Status { get; set; }
}

public class ContractAttachmentBatch : AuditEntity
{
    public int BatchId { get; set; }
    public int ContractId { get; set; }
    public Contract? Contract { get; set; }
    public int TotalAttachments { get; set; }
    public BatchStatus Status { get; set; }
}
