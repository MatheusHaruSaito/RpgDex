using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.ValueObjects
{
    public record class CampaignSettings
    {
        public bool RequireApprovalForCharacters { get; init; }

        public CampaignSettings()
        {
            RequireApprovalForCharacters = true;
        }
    }
}
