using ContractManager.Api.Services;

namespace ContractManager.Api.Tests;

/// <summary>
/// Unit tests for VendorService helper methods (no I/O).
/// Covers the Jaro-Winkler similarity threshold called out in plan.md §8 Q2 / ADR-010.
/// </summary>
public class VendorServiceTests
{
    [Theory]
    [InlineData("The Ritz-Carlton, Inc.", "ritz carlton")]
    [InlineData("ACME Corporation", "acme")]
    [InlineData("Initech LLC.", "initech")]
    public void NormalizeForMatch_StripsSuffixesAndPunctuation(string input, string expected)
    {
        // Arrange + Act
        var result = VendorService.NormalizeForMatch(input);

        // Assert
        Assert.Equal(expected, result);
    }

    [Theory]
    [InlineData("ritz carlton", "ritz carlton", 1.0)]
    [InlineData("microsoft", "microsft", 0.95)]
    public void JaroWinkler_ReturnsHighSimilarityForCloseStrings(string source, string target, double minScore)
    {
        // Arrange + Act
        var similarity = VendorService.JaroWinklerSimilarity(source, target);

        // Assert
        Assert.True(similarity >= minScore, $"Expected ≥ {minScore} but got {similarity}");
    }

    [Fact]
    public void JaroWinkler_LowSimilarityForUnrelatedNames()
    {
        // Arrange + Act
        var similarity = VendorService.JaroWinklerSimilarity("microsoft", "microsoft federal");

        // Assert — names that share a prefix but represent distinct vendors should NOT merge
        Assert.True(similarity < 0.92, $"Expected < 0.92 (dedup threshold) but got {similarity}");
    }
}
