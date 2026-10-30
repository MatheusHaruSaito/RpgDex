using RpgDex.Application.Dto;
using RpgDex.Application.Dto.Canvas;
using RpgDex.Domain.Common;

namespace RpgDex.Application.Interfaces
{
    public interface ICanvaElementService
    {
        Task<Result<CanvasElementResponse>> CreateElement(string userId,CreateCanvaElementRequest request);
        Task<Result<CanvasElementResponse>> CreateTokenElement(string userId, CreateCanvaTokenElementRequest request,decimal imageSize=0);
        Task<Result<CanvasElementResponse>> QuickCreateTokenElement(string userId, QuickCreateCanvaTokenElementRequest request);
        Task<Result<GetAllCanvasElementResponse>> GetAllElements(string userId,Guid     campaignI, int page = 1, int pageSize = 20);
        Task<Result<CanvasElementResponse>> UpdateElement(string userId, UpdateCanvasElementRequest request);
        Task<Result<bool>> MoveElement(string userId, MoveCanvaElementsRequest request);
        Task<Result<bool>> ReOrderElement(string userId,ReOrderCanvaElementsRequest request);
        Task<Result<bool>> SetElementActiveState(string userId,SetElementActiveStateRequest request,bool state);

    }
}
