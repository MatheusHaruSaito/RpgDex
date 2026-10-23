using RpgDex.Application.Dto;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface ICampaignQueries
    {
        Task<ChartResponse> GetCampaignChart(DateTime startDate, DateTime endDate);
    }
}
