using RpgDex.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record ReportDetailResponse(
        Guid Id,
        string Title,
        string Description,
        bool IsActive,
        DateTime CreatedAt,
        ReportEnum ReportType,
        ReportOwnerResponse ReportOwner,
        object? Target
        );
}
