using RpgDex.Application.Dto;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface ICharacterQueries
    {
        Task<ChartResponse> GetCharacterChart(DateTime startDate, DateTime endDate);

    }
}
