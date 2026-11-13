using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record CampaignCharacterSummary(Guid Id, string Name, string? IconPath, Guid UserId);
}
