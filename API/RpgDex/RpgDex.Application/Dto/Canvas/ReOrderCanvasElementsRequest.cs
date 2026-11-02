namespace RpgDex.Application.Dto.Canvas
{
    public record ReOrderCanvasElementsRequest(Guid CampaignId, List<ReOrderCanvasElement> Items, string? ExceptConnectionId = null);
}
