using RpgDex.Application.Dto;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface IUserQueries
    {
        Task<ChartResponse> GetUserChart(DateTime startDate, DateTime endDate);
    }
}
