using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Canvas
{
    public record ReOrderElementsEvent(IReadOnlyList<ReOrderCanvasElement> Elements, string? ExceptConnectionId = null);
}
