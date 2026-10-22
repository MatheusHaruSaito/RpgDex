using RpgDex.Application.Dto.Report;
using RpgDex.Domain.Common;


namespace RpgDex.Application.Interfaces
{
    public interface IReportService
    {
        Task<Result<ReportResponse>> Create(string userId, CreateReportRequest request);
        Task<Result<GetAllReportResponse>> GetAll(int page, int pageSize);
        Task<Result<ReportDetailResponse>> GetById(Guid id);
        Task<Result<ReportResponse>> Close(CloseReportRequest request);
        //In the future add the possibility to chose punishment time
        Task<Result<ReportResponse>> PunishAndCloseAsync(UserPunishRequest request);
    }
}
