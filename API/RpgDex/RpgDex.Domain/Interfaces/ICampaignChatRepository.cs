using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface ICampaignChatRepository
    {
        Task<CampaignChat> InsertAsync(CampaignChat campaign);
        Task<bool> UpdateCampaignChatMessage(Guid id, IEnumerable<ChatMessage> campaign);
        Task<CampaignChat> GetCampaignChat(Guid campaignId);
    }
}
