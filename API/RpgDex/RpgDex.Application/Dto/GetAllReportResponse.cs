using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record GetAllReportResponse(IEnumerable<ReportResponse> Reports, long Count);
}
