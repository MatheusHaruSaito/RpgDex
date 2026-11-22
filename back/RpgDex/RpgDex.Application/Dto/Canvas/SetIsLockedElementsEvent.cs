using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Canvas
{
    public record SetIsLockedElementsEvent(IReadOnlyList<Guid> ElementIds, bool State, string? ExceptConnectionId = null);
}
