using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Canvas
{
    //public record ChangeColorCanvasElementsRequest(Guid CampaignId, List<ChangeColorCanvasElement> Items, string? ExceptConnectionId = null);
    public record ChangeColorCanvasElementsRequest(Guid CampaignId, List<Guid> Ids,string Color, string? ExceptConnectionId = null);

}
