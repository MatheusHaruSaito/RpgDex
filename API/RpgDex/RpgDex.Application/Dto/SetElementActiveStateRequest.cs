using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record SetElementActiveStateRequest(Guid CampaignId, Guid Id);
}
