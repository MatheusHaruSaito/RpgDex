using RpgDex.Application.Dto;
using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface ICampaignChatService
    {
        Task SendMessage(string campaignId, CampaignChatMessagesResponse message);
    }
}
