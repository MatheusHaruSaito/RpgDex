using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public class RemovePlayerFromCampaignRequest
    {
        public Guid CampaignId { get; set; }
        public Guid PlayerId { get; set; }
    }
}
