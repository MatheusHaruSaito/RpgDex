using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public class CampaignSetActiveStateRequest
    {
        public Guid Id { get; set; }
        public bool State { get; set; }
    }
}
