using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record DiceRollsLogResult(Guid UserId, string Expression, IEnumerable<DiceRollEntryDto> Entires, DateTime CreatedAt);
    public record DiceRollEntryDto(string Breakdown, List<int> Results, double Total);

}
