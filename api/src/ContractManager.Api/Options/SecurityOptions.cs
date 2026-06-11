namespace ContractManager.Api.Options;

public class SecurityOptions
{
    public FrontDoorOptions FrontDoor { get; set; } = new();

    public class FrontDoorOptions
    {
        /// <summary>Front Door ID for AFD lockdown middleware. When empty, the middleware no-ops (local dev / non-AFD deploys).</summary>
        public string? FrontDoorId { get; set; }
    }
}
