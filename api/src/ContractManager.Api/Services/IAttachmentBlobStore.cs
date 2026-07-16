using Azure.Storage.Blobs;
using Azure.Storage.Blobs.Models;

namespace ContractManager.Api.Services;

/// <summary>
/// Storage backend for contract-attachment file bytes. Two implementations:
/// <see cref="AzureBlobAttachmentStore"/> talks to Azure Blob Storage (prod / staging),
/// <see cref="FilesystemAttachmentStore"/> writes to a local directory (dev only).
/// Program.cs picks by <see cref="Options.AttachmentOptions.BlobServiceUri"/>.
/// </summary>
public interface IAttachmentBlobStore
{
    Task UploadAsync(string path, Stream content, string contentType, CancellationToken ct);
    Task<Stream> DownloadAsync(string path, CancellationToken ct);
    Task DeleteIfExistsAsync(string path, CancellationToken ct);
}

public class AzureBlobAttachmentStore : IAttachmentBlobStore
{
    private readonly BlobContainerClient _container;

    public AzureBlobAttachmentStore(BlobContainerClient container) => _container = container;

    public async Task UploadAsync(string path, Stream content, string contentType, CancellationToken ct)
    {
        var blobClient = _container.GetBlobClient(path);
        await blobClient.UploadAsync(content,
            new BlobUploadOptions { HttpHeaders = new BlobHttpHeaders { ContentType = contentType } },
            ct).ConfigureAwait(false);
    }

    public async Task<Stream> DownloadAsync(string path, CancellationToken ct)
    {
        var blobClient = _container.GetBlobClient(path);
        var response = await blobClient.DownloadStreamingAsync(cancellationToken: ct).ConfigureAwait(false);
        return response.Value.Content;
    }

    public async Task DeleteIfExistsAsync(string path, CancellationToken ct)
    {
        var blobClient = _container.GetBlobClient(path);
        await blobClient.DeleteIfExistsAsync(cancellationToken: ct).ConfigureAwait(false);
    }
}

/// <summary>
/// Dev-only. Persists attachment bytes under a local root directory so smoke-testing
/// works without an Azure account or Azurite emulator. Never register outside Development.
/// </summary>
public class FilesystemAttachmentStore : IAttachmentBlobStore
{
    private readonly string _root;

    public FilesystemAttachmentStore(string root)
    {
        if (string.IsNullOrWhiteSpace(root))
        {
            throw new ArgumentException("Filesystem attachment root must be set.", nameof(root));
        }
        var normalized = Path.GetFullPath(root);
        // Ensure trailing separator so the StartsWith check in ResolveInsideRoot cannot
        // match sibling directories with the same prefix (e.g. `/foo/bar` incorrectly
        // allowing `/foo/barbaz/file`).
        _root = normalized.EndsWith(Path.DirectorySeparatorChar)
            ? normalized
            : normalized + Path.DirectorySeparatorChar;
        Directory.CreateDirectory(_root);
    }

    public async Task UploadAsync(string path, Stream content, string contentType, CancellationToken ct)
    {
        var full = ResolveInsideRoot(path);
        var directory = Path.GetDirectoryName(full);
        if (!string.IsNullOrEmpty(directory)) Directory.CreateDirectory(directory);
        await using var file = File.Create(full);
        await content.CopyToAsync(file, ct).ConfigureAwait(false);
    }

    public Task<Stream> DownloadAsync(string path, CancellationToken ct)
    {
        var full = ResolveInsideRoot(path);
        if (!File.Exists(full)) throw new FileNotFoundException("Attachment blob not found.", full);
        Stream stream = File.OpenRead(full);
        return Task.FromResult(stream);
    }

    public Task DeleteIfExistsAsync(string path, CancellationToken ct)
    {
        var full = ResolveInsideRoot(path);
        if (File.Exists(full)) File.Delete(full);
        return Task.CompletedTask;
    }

    /// <summary>
    /// Defensive: prevent path traversal even though the API-layer sanitises the file name.
    /// The upload path is server-generated (opaque GUID) so this is belt-and-braces.
    /// </summary>
    private string ResolveInsideRoot(string path)
    {
        var candidate = Path.GetFullPath(Path.Combine(_root, path));
        if (!candidate.StartsWith(_root, StringComparison.OrdinalIgnoreCase))
        {
            throw new UnauthorizedAccessException("Refused blob path outside store root.");
        }
        return candidate;
    }
}
