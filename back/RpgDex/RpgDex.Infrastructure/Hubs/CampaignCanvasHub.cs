using Microsoft.AspNetCore.SignalR;

namespace RpgDex.Infrastructure.Hubs
{
    public class CampaignCanvasHub() : Hub
    {
        public async Task JoinCampaignCanvas(string campaignId)
        {
            await Groups.AddToGroupAsync(Context.ConnectionId, $"campaign-canvas-{campaignId}");
        }
        public async Task LeaveCampaignCanvas(string campaignId)
        {
            await Groups.RemoveFromGroupAsync(Context.ConnectionId, $"campaign-canvas-{campaignId}");
        }
    }
}
