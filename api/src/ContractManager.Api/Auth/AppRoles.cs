namespace ContractManager.Api.Auth;

/// <summary>App role names used for authorization. Match the Entra ID app-role values.</summary>
public static class AppRoles
{
    public const string Procurement = "Procurement";
    public const string Requester = "Requester";
    public const string AttorneyReviewer = "AttorneyReviewer";
}
