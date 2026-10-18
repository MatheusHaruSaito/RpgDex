using RpgDex.Domain.Entities;
using RpgDex.Domain.ValueObjects;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface ICanvaElementRepository
    {
        Task<CanvaElement> InsertElementAsync(CanvaElement canvaElement);
        Task<IEnumerable<CanvaElement>> GetAllElementsByCampaignAsync(Guid campaignId, int page=1, int pageSize=20);
        Task<bool> UpdateElementAsync(CanvaElement newElement);
        Task<bool> MoveElementAsync(Guid campaignId,IEnumerable<ElementPosition> items);
        Task<bool> MoveElementAsync(Guid campaignId, ElementPosition item);
        Task<bool> ReorderElementsAsync(Guid campaignId, IEnumerable<ElementOrder> items);
        Task<bool> SetActiveState(Guid id,Guid campaignId, bool state);


    }
}
