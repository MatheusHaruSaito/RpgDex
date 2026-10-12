using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface IReportRepository
    {
        Task<Report> InsertAsync(Report report);
        Task<IEnumerable<Report>> GetAllAsync(int page = 1, int pageSize = 5);
        Task<Report> GetByIdAsync(Guid id);
        Task<long> GetReportsCountAsync();
        Task<bool> SetActiveState(Guid Id, bool ActiveState);
    }
}
