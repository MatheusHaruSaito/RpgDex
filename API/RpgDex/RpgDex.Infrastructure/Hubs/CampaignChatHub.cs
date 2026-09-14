using Microsoft.AspNetCore.SignalR;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Hubs
{
    public class CampaignChatHub : Hub
    {
        public async Task JoinCampaign(string campaignId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId,$"campaign-{campaignId}");
        }
        public async Task LeaveCampaign(string campaignId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"campaign-{campaignId}");
        }
    }
}
