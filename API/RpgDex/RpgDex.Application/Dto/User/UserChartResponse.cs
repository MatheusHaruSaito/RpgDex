using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.User
{
    public record UserChartResponse(IReadOnlyList<UserChartPoint> Points, long Total, long UsersInRange);
    public record UserChartPoint(int Year, int Month, int UserCount);

}
