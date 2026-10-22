using RpgDex.Application.Dto.User;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface IUserQueries
    {
        Task<UserChartResponse> GetUserChart(DateTime startDate, DateTime endDate);
    }
}
