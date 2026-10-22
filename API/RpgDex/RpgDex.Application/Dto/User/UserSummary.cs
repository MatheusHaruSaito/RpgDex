using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record UserSummary(Guid Id, string UserName, string DisplayName, string? IconPath, bool IsLocked);
}
