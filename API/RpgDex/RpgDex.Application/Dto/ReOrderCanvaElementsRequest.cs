namespace RpgDex.Application.Dto
{
    public record ReOrderCanvaElementsRequest(Guid CampaignId, List<ReOrderElementItem> Items);
}
