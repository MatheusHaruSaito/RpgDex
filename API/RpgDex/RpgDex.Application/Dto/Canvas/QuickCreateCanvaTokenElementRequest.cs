using Microsoft.AspNetCore.Http;
using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Canvas
{
    public record QuickCreateCanvaTokenElementRequest(IFormFile? CharacterIcon, Guid CampaignId, double X, double Y, int Z, double Scale, string Content, string? Color, CanvasElementType ElementType = CanvasElementType.Token);
}
