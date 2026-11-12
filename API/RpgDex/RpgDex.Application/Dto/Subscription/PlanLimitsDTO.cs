using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Subscription
{
    public record PlanLimitsDTO(bool HasEarlyAccess, int CharacterQty, int CampaignQty, int DocumentsSpaceMB, int CanvasSpaceMb);
}
