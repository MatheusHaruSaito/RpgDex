using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface ICampaignDiceLogRepository
    {
        Task<bool> AddRollAsync(Guid campaignId,DiceRoll roll);
        Task<CampaignDiceLog> GetCampaignDiceLog(Guid campaignId);

    }
}
