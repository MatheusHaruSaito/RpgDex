using RpgDex.Domain.Entities;
using RpgDex.Domain.ValueObjects;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface ICanvasElementRepository
    {
        Task<CanvasElement> InsertElementAsync(CanvasElement canvaElement);
        Task<int> CountByCampaignAsync(Guid campaignId);
        Task<CanvasElement> GetByIdAsync(Guid campaignId,Guid id);
        Task<bool> UpdateElementAsync(CanvasElement newElement);
        Task<bool> MoveElementAsync(Guid campaignId,IEnumerable<ElementPosition> items);
        Task<bool> MoveElementAsync(Guid campaignId, ElementPosition item);
        Task<bool> ReorderElementsAsync(Guid campaignId, IEnumerable<ElementOrder> items);
        Task<bool> SetActiveState(IEnumerable<Guid> ids,Guid campaignId, bool state);

        public record GetAllCanvasElementResponse(IEnumerable<CanvasElement> elements, int Count );
    }
}
