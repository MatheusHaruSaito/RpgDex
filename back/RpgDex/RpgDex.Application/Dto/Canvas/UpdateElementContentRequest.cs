using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Canvas
{
    public record UpdateElementContentRequest(Guid CampaignId,Guid ElementId, string Content, string? ExceptConnectionId = null);
}
