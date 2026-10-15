using RpgDex.Application.Dto;
using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface IReportQueries
    {
        Task<ReportDetailResponse?> GetDetailAsync(Guid id);
    }
}
