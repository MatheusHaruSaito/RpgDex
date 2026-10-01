using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record RemoveCharacterFromCapaignRequest(Guid CampaignId,Guid CharacterId);
}
