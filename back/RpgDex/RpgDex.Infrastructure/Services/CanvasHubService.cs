using Microsoft.AspNetCore.SignalR;
using RpgDex.Application.Dto.Canvas;
using RpgDex.Application.Interfaces;
using RpgDex.Infrastructure.Hubs;

namespace RpgDex.Infrastructure.Services
{
    public class CanvasHubService(IHubContext<CampaignCanvasHub> hub) : ICanvasHubService
    {
        private static string Group(string campaignId) => $"campaign-canvas-{campaignId}";

        public Task AddElement(string campaignId, CreateElementEvent evt)
            => Target(campaignId, evt.ExceptConnectionId).SendAsync("ElementAdded", evt.Element);

        public Task ChangeColorElements(string campaignId, ChangeColorElementsEvent evt)
            => Target(campaignId, evt.ExceptConnectionId).SendAsync("ElementColorChanged", new {ids = evt.Ids, color = evt.Color});

        public Task MoveElements(string campaignId, MoveElementsEvent evt)
            =>Target(campaignId, evt.ExceptConnectionId).SendAsync("ElementsMoved", evt.Elements);

        public Task ReOrderElements(string campaignId, ReOrderElementsEvent evt)
            => Target(campaignId, evt.ExceptConnectionId).SendAsync("ElementsReOrdered", evt.Elements);

        public Task ScaleElements(string campaignId, ScaleElementsEvent evt)
            => Target(campaignId, evt.ExceptConnectionId).SendAsync("ElementsScaled", evt.Elements);
        
        public Task SetActiveElements(string campaignId, SetActiveElementsEvent evt)
            => Target(campaignId, evt.ExceptConnectionId).SendAsync("ElementsActiveChanged", new { ids = evt.ElementIds, state = evt.State });

        public Task UpdateElementContent(string campaignId, UpdateElementContentEvent evt)
         => Target(campaignId, evt.ExceptConnectionId).SendAsync("ElementContentChanged", new { id = evt.ElementId, content = evt.Content });
        public Task SetIsLockedState(string campaignId, SetIsLockedElementsEvent evt)
         => Target(campaignId, evt.ExceptConnectionId).SendAsync("SetIsLockedState", new { ids = evt.ElementIds, state = evt.State });


        private IClientProxy Target(string campaignId, string? exceptConnectionId)
            => exceptConnectionId is null
                ? hub.Clients.Group(Group(campaignId))
                : hub.Clients.GroupExcept(Group(campaignId), exceptConnectionId);
    }
}
