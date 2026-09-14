using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record CampaignChatMessagesResponse(Guid UserId, string Username, string UserIcon, string Data, DateTime SentAt);
}
