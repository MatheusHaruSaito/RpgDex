namespace RpgDex.Application.Dto
{
    public record ReorderElementsRequest(Guid CampaignId, List<ReorderElementItem> Items);
}
