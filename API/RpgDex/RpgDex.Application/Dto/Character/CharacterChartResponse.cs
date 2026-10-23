using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Character
{
    public record CharacterChartResponse(IReadOnlyList<ChartPoint> Points, long Total, long UsersInRange);
}
