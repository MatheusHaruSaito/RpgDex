using RpgDex.Application.Dto.User;
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;

namespace RpgDex.Application.Dto.Report
{
    public record ReportedCharacterProfile(
        Guid Id,
        string Name,
        string? IconPath,
        string Description,
        bool IsActive,
        DateTime CreatedAt,
        DateTime LastAccess,
        UserSummary? Owner,
        Dictionary<string,object> Properties
    );
}
