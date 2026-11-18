using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Canvas
{

    public record MoveCanvasElementsRequest(Guid CampaignId, List<MoveCanvasElement> Items,string? ExceptConnectionId);
}
