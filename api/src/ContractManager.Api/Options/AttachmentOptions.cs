namespace ContractManager.Api.Options;

public class AttachmentOptions
{
    public string ContainerName { get; set; } = "contract-attachments";
    public string BlobServiceUri { get; set; } = string.Empty;
    public long MaxFileSizeBytes { get; set; } = 50L * 1024 * 1024; // 50 MB
    public string[] AllowedContentTypes { get; set; } = Array.Empty<string>();
}
