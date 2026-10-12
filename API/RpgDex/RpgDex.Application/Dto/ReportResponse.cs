using RpgDex.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record ReportResponse(Guid Id,string Title, string Description, Guid ReportOwner, Guid DataId, Guid ReportedUser, bool IsActive, ReportEnum ReportType);
}
