using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{

    public record MoveElementsRequest(Guid CampaignId, List<MoveElementItem> Items);
}
