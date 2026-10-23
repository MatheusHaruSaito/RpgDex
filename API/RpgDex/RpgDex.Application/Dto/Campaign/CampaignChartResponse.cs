using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Campaign
{
    public record CampaignChartResponse(IReadOnlyList<ChartPoint> Points, long Total, long TotalInRange);
} 
