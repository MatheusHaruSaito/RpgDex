
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record GetAllCampaignResponse(IEnumerable<CampaignResponse> Campaigns,int MaxCampaigns ,int CampaignGameMasterLength, int CampaignPlayerLength);
}
