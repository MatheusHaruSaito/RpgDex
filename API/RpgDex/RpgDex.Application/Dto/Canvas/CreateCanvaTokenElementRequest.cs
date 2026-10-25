using Microsoft.AspNetCore.Http;
using RpgDex.Domain.Entities;
using RpgDex.Domain.ValueObjects;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Canvas
{
    public record CreateCanvaTokenElementRequest(Guid CampaignId,Guid CharacterId, double X, double Y, int Z, double Scale, string? Content, string? Color, CanvasElementType ElementType = CanvasElementType.Token);
}
