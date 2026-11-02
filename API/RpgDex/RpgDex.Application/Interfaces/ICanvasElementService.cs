using RpgDex.Application.Dto.Canvas;
using RpgDex.Domain.Common;

namespace RpgDex.Application.Interfaces
{
    public interface ICanvasElementService
    {
        Task<Result<CanvasElementResponse>> CreateElement(string userId,CreateCanvaElementRequest request);
        Task<Result<CanvasElementResponse>> CreateTokenElement(string userId, CreateCanvaTokenElementRequest request,decimal imageSize=0);
        Task<Result<CanvasElementResponse>> QuickCreateTokenElement(string userId, QuickCreateCanvaTokenElementRequest request);
        Task<Result<GetAllCanvasElementResponse>> GetAllElements(string userId,Guid campaignId, double? minX, double? minY, double? maxX, double? maxY);
        Task<Result<CanvasElementResponse>> UpdateElement(string userId, UpdateCanvasElementRequest request);
        Task<Result<bool>> MoveElement(string userId, MoveCanvasElementsRequest request);
        Task<Result<bool>> ReOrderElement(string userId,ReOrderCanvasElementsRequest request);
        Task<Result<bool>> ScaleElement(string userId, ScaleCanvasElementsRequest request);
        Task<Result<bool>> SetElementActiveState(string userId,SetElementActiveStateRequest request,bool state);

    }
}
