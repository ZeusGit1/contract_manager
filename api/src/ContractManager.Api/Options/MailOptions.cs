namespace ContractManager.Api.Options;

/// <summary>
/// Per ADR-039, Phase 1 ships only the <c>InAppLogOnly</c> provider. A follow-up build can
/// register a <c>GraphMail</c> provider and flip this flag — no schema or contract change
/// required. Configuration section: <c>Mail</c>.
/// </summary>
public class MailOptions
{
    /// <summary>InAppLogOnly | GraphMail. Default InAppLogOnly.</summary>
    public string Provider { get; set; } = "InAppLogOnly";
}
