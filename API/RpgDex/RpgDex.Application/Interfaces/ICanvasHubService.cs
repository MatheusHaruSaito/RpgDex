using RpgDex.Application.Dto;
using RpgDex.Application.Dto.Canvas;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface ICanvasHubService
    {
        Task AddElement(string campaignId, CreateElementEvent evt);
        Task MoveElements(string campaignId, MoveElementsEvent evt);
        Task ScaleElements(string campaignId, ScaleElementsEvent evt);
        Task ReOrderElements(string campaignId, ReOrderElementsEvent evt);
        Task SetActiveElements(string campaignId, SetActiveElementsEvent evt);

    }
}
