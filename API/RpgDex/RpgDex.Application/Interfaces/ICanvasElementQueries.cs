using RpgDex.Application.Dto.Canvas;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface ICanvasElementQueries
    {
        Task<GetAllCanvasElementResponse> GetAllCanvasElementByCampaignIdAsync(Guid campaignId, double? minX, double? minY, double? maxX, double? maxY);
    }
}
