using RpgDex.Application.Dto;
using RpgDex.Domain.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface IReportService
    {
        Task<Result<ReportResponse>> Create(string userId, CreateReportRequest request);
        Task<Result<GetAllReportResponse>> GetAll(int page, int pageSize);
        Task<Result<ReportResponse>> GetById(Guid id);
        Task<Result<ReportResponse>> Close(CloseReportRequest request);
        //Task<ReportResponse> PunishUser(UserPunishRequest request);
    }
}
