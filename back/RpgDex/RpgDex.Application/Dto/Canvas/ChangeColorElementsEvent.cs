using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Canvas
{
    public record ChangeColorElementsEvent(IReadOnlyList<Guid> Ids,string Color, string? ExceptConnectionId = null);
}
