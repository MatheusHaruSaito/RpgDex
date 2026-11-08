using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Canvas
{
    public record SetElementActiveStateRequest(Guid CampaignId, List<Guid> Ids);
}
