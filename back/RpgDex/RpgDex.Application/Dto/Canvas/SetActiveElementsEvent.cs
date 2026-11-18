using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Canvas
{
    public record SetActiveElementsEvent(IReadOnlyList<Guid> ElementIds, bool State, string? ExceptConnectionId = null);
}
