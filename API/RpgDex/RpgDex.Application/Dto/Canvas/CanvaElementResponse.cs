using RpgDex.Domain.Entities;
using RpgDex.Domain.ValueObjects;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Canvas
{
    public record CanvasElementResponse(Guid Id, CanvaElementType ElementType, double X, double Y, int Z, double Scale, string? Content, string? Color, string? ImageUrl, List<CanvasPoint>? Points, double? StrokeWidth);
}
