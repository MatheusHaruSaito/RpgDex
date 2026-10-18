using RpgDex.Domain.ValueObjects;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record UpdateElementRequest(Guid Id, Guid CampaignId, double Scale, string? Content, string? Color, string? ImageUrl, List<CanvasPoint>? Points, double? StrokeWidth);
}
