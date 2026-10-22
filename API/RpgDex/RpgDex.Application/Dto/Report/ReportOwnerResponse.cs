using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Report
{
    public record ReportOwnerResponse(Guid Id, string UserName, string DisplayName);
}
