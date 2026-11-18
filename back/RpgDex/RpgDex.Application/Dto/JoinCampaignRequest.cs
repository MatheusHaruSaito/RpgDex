using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public class JoinCampaignRequest
    {
        public Guid CampaignId { get; set; }
        public string? Password { get; set; }
    }
}
