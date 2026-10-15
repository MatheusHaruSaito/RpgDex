using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record ReportedUserProfile(
    Guid Id,
    string UserName,
    string DisplayName,
    string Email,
    string? IconPath,
    int CharactersCount,
    int CampaignsCount,
    bool IsLocked,
    DateTimeOffset? DateTimeOffset
    );
}
