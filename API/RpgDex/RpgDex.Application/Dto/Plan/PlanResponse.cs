using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Plan
{
    public record PlanResponse(Guid Id,string Name, string Description, decimal Price, bool HasEarlyAccess, int CharacterPerCampaignQty, int CampaignQty, int DocumentsSpaceMB, int DurationDays);
}
