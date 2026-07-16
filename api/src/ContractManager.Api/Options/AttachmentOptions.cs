namespace ContractManager.Api.Options;

public class AttachmentOptions
{
    public string ContainerName { get; set; } = "contract-attachments";
    public string BlobServiceUri { get; set; } = string.Empty;
    public long MaxFileSizeBytes { get; set; } = 50L * 1024 * 1024; // 50 MB
    public string[] AllowedContentTypes { get; set; } = Array.Empty<string>();

    /// <summary>
    /// Dev-only. When set (and BlobServiceUri is empty), attachments are stored on the
    /// local filesystem under this path instead of Azure Blob Storage. Enables local
    /// smoke-testing without an Azure account or Azurite emulator.
    /// </summary>
    public string LocalStoragePath { get; set; } = string.Empty;
}
