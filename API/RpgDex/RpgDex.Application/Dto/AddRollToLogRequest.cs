namespace RpgDex.Application.Dto
{
    public record AddRollToLogRequest(Guid CampaignId, string Expression, List<int> Results);
}
