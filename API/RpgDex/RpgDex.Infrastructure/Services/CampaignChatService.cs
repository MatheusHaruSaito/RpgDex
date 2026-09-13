using Microsoft.AspNetCore.SignalR;
using RpgDex.Application.Dto;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Entities;
using RpgDex.Infrastructure.Hubs;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Services
{
    public class CampaignChatService(IHubContext<CampaignChatHub> campaignChatHub) : ICampaignChatService
    {
        public async Task SendMessage(string campaignId, CampaignChatMessagesResponse message)
        {
            await campaignChatHub.Clients
                .Group($"campaign-{campaignId}")
                .SendAsync("ReceiveMessage",message);
        }
    }
}
