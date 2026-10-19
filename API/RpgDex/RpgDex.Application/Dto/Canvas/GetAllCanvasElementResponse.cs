using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Canvas
{
    public record GetAllCanvasElementResponse(IEnumerable<CanvasElementResponse> Elements, int Count);
}
