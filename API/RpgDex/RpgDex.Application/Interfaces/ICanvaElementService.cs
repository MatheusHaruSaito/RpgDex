using RpgDex.Application.Dto;
using RpgDex.Domain.Common;

namespace RpgDex.Application.Interfaces
{
    public interface ICanvaElementService
    {
        Task<Result<CanvasElementResponse>> CreateElement(string userId,CreateCampaignElementRequest request);
        Task<Result<GetAllCanvasElementResponse>> GetAllElements(string userId,Guid campaignId);
        Task<Result<CanvasElementResponse>> UpdateElement(string userId, UpdateElementRequest request);
        Task<Result<bool>> MoveElement(string userId, MoveElementsRequest request);
        Task<Result<bool>> ReOrderElement(ReorderElementsRequest request);
        Task<Result<bool>> SetElementActiveState(SetElementActiveStateRequest request,bool state);

    }
}
