using Microsoft.AspNetCore.Http;
using RpgDex.Domain.ValueObjects;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record UpdateCanvaElementRequest(Guid Id, Guid CampaignId, double Scale, string? Content, string? Color, IFormFile? Image, List<CanvasPoint>? Points, double? StrokeWidth);
}
