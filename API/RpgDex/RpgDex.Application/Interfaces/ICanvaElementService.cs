using RpgDex.Application.Dto;
using RpgDex.Domain.Common;

namespace RpgDex.Application.Interfaces
{
    public interface ICanvaElementService
    {
        Task<Result<CanvasElementResponse>> CreateElement(string userId,CreateCanvaElementRequest request);
        Task<Result<GetAllCanvasElementResponse>> GetAllElements(string userId,Guid campaignI, int page = 1, int pageSize = 20);
        Task<Result<CanvasElementResponse>> UpdateElement(string userId, UpdateCanvaElementRequest request);
        Task<Result<bool>> MoveElement(string userId, MoveCanvaElementsRequest request);
        Task<Result<bool>> ReOrderElement(string userId,ReOrderCanvaElementsRequest request);
        Task<Result<bool>> SetElementActiveState(string userId,SetElementActiveStateRequest request,bool state);

    }
}
