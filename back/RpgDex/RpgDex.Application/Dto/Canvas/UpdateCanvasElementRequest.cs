using Microsoft.AspNetCore.Http;
using RpgDex.Domain.ValueObjects;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Canvas
{
    public record UpdateCanvasElementRequest(Guid Id, Guid CampaignId, double Scale, string? Content, string? Color, IFormFile? Image, List<CanvasPoint>? Points, double? StrokeWidth);
}
