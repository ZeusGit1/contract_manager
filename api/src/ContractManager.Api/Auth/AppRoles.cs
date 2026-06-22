namespace ContractManager.Api.Auth;

/// <summary>
/// App role names used for authorization. Match the Entra ID app-role values.
/// ProcurementAdmin is layered on top of Procurement (an admin is also a Procurement
/// member, with the extra capability to manage Categories &amp; Fields per ADR-032).
/// </summary>
public static class AppRoles
{
    public const string Procurement = "Procurement";
    public const string ProcurementAdmin = "ProcurementAdmin";
    public const string Requester = "Requester";
    public const string AttorneyReviewer = "AttorneyReviewer";
}
