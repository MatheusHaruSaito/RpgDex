using RpgDex.Application.Dto.User;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Report
{
    public record ReportedUserProfile(
    UserSummary UserSummary,
    int CharactersCount,
    int CampaignsCount,
    DateTimeOffset? DateTimeOffset
    );
}
