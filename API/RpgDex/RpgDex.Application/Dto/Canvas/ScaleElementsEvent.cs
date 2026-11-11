using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Canvas
{
    public record ScaleElementsEvent(IReadOnlyList<ScaleCanvasElement> Elements, string? ExceptConnectionId = null);
}
