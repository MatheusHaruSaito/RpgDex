using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Canvas
{
    public record ScaleCanvasElementsRequest(Guid CampaignId, List<ScaleCanvasElement> Items);
}
