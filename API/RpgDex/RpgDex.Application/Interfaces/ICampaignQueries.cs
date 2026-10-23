using RpgDex.Application.Dto.Campaign;
using RpgDex.Application.Dto.Character;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface ICampaignQueries
    {
        Task<CampaignChartResponse> GetCampaignChart(DateTime startDate, DateTime endDate);
    }
}
