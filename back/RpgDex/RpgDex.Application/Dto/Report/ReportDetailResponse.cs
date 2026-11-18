using RpgDex.Domain.Enums;

namespace RpgDex.Application.Dto.Report
{
    public record ReportDetailResponse(
        Guid Id,
        string Title,
        string Description,
        bool IsActive,
        DateTime CreatedAt,
        ReportEnum ReportType,
        ReportOwnerResponse ReportOwner,
        object? Target,
        List<string>? ImagesPath 
    );
}