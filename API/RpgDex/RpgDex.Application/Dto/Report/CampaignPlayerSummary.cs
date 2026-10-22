using RpgDex.Application.Dto.User;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Report
{
    public record CampaignPlayerSummary(UserSummary User, IReadOnlyList<Guid> CharacterIds);
}
