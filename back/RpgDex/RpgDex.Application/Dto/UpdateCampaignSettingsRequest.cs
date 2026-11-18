using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public class UpdateCampaignSettingsRequest
    {
        public Guid CampaignId { get; set; }
        public bool RequireApprovalForCharacters { get; init; }
    }
}
