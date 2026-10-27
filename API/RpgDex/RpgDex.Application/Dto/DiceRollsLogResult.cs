using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record DiceRollsLogResult(Guid UserId, string Expression, List<int> Results, double Total, DateTime CreatedAt);
}
