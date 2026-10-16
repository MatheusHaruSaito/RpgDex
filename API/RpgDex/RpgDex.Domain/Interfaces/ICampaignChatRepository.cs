using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface ICampaignChatRepository
    {
        Task<ChatMessage> InsertAsync(ChatMessage campaign);
        Task<ChatMessage> GetById(Guid id);
        Task<ChatMessage?> UpdateData(ChatMessage message);
        Task<IEnumerable<ChatMessage>> GetMessagesPagedAsync(Guid campaignId, DateTime? beforeSentAt, int pageSize = 20);
    }
}
