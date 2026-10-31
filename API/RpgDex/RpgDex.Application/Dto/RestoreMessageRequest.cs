using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record RestoreMessageRequest(Guid MessageId, Guid CampaignId,int HistoryIndex);
}
