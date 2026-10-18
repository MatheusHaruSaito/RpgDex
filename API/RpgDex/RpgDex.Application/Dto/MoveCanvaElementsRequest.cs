using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{

    public record MoveCanvaElementsRequest(Guid CampaignId, List<MoveElementItem> Items);
}
