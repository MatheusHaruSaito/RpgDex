using RpgDex.Application.Dto;

namespace RpgDex.Application.Interfaces
{
    public interface ICampaignChatService
    {
        Task SendMessage(string campaignId, CampaignChatMessagesResponse message);
    }
}
