using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Hubs
{
    public class CampaignChatHub() : Hub
    {
        public async Task JoinCampaignChat(string campaignId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId,$"campaign-chat-{campaignId}");
        }
        public async Task LeaveCampaignChat(string campaignId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"campaign-chat-{campaignId}");
        }
    }
}
