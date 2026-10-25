using RpgDex.Application.Dto.Canvas;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface ICanvasElementQueries
    {
        Task<GetAllCanvasElementResponse> GetAllCanvasElementByCampaignIdAsync(Guid campaignId, int page = 1, int pageSize = 20);
    }
}
