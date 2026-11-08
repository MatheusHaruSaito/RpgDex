namespace RpgDex.Application.Dto.Canvas
{
    public record ReOrderCanvaElementsRequest(Guid CampaignId, List<ReOrderElementItem> Items);
}
