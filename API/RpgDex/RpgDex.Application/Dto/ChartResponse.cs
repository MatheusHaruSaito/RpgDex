using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record ChartResponse(IReadOnlyList<ChartPoint> Points, long Total, long TotalInRange);

}
