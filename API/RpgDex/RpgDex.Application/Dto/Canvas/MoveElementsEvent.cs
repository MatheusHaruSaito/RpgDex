using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Canvas
{
    public record MoveElementsEvent(IReadOnlyList<MoveCanvasElement> Elements, string? ExceptConnectionId = null);
}
