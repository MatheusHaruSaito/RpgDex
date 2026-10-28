using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record AddCharacterToCampaignRequest(Guid CampaignId, Guid CharacterId);
}
