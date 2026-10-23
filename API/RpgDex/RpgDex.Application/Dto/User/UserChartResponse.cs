using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.User
{
    public record UserChartResponse(IReadOnlyList<ChartPoint> Points, long Total, long UsersInRange);

}
