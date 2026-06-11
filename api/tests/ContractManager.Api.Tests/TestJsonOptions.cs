using System.Text.Json;
using System.Text.Json.Serialization;

namespace ContractManager.Api.Tests;

/// <summary>
/// Shared JSON options for integration tests so enum responses are read as string names —
/// mirrors the API's serialization configuration (per api-testing-guidelines.md / api-coding-standards.md).
/// </summary>
public static class TestJsonOptions
{
    public static readonly JsonSerializerOptions Default = new(JsonSerializerDefaults.Web)
    {
        Converters = { new JsonStringEnumConverter() },
    };

    public static async Task<T?> ReadAsAsync<T>(this HttpResponseMessage response)
    {
        var stream = await response.Content.ReadAsStreamAsync().ConfigureAwait(false);
        return await JsonSerializer.DeserializeAsync<T>(stream, Default).ConfigureAwait(false);
    }
}
