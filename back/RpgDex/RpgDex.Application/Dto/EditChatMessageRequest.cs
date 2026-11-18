using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record EditChatMessageRequest(Guid MessageId, Guid CampaignId, string NewMessage);
}
