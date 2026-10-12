using RpgDex.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record CreateReportRequest(string Title, string Description, Guid DataId, ReportEnum ReportType);

}
