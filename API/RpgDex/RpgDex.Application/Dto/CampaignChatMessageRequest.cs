using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record CampaignChatMessageRequest(Guid CampaignId, string Message);

}
