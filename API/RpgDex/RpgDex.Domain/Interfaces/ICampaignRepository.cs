using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface ICampaignRepository
    {
        Task<Campaign> InsertAsync(Campaign campaign);
        Task<Campaign> GetByIdAsync(Guid id);
        Task<Campaign> UpdateAsync(Campaign newCampaign);
        Task<bool> SetActiveState(Guid Id, bool ActiveState);
        Task<bool> RemoveCharacterFromCampaigns(Guid characterId);
        Task<bool> SetAllActiveStateByUserId(Guid Id, bool ActiveState);
        Task<bool> RemoveUserFromCampaigns(Guid userId);

    }
}
