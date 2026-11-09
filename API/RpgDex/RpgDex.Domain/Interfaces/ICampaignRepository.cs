using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface ICampaignRepository
    {
        Task<Campaign> InsertAsync(Campaign campaign);
        Task<GetAllCampaignResult> GetAllAsync(Guid userId, int page=1, int pageSize=5);
        Task<GetAllCampaignResult> GetAllAsync(Guid userId);
        Task<Campaign> GetByIdAsync(Guid id);
        Task<Campaign> UpdateAsync(Campaign newCampaign);
        Task<bool> SetActiveState(Guid Id, bool ActiveState);
        Task<bool> SetAllActiveStateByUserId(Guid Id, bool ActiveState);
        Task<bool> RemoveUserFromCampaigns(Guid userId);

    }
    public record GetAllCampaignResult(IEnumerable<Campaign> campaign,int campaignLenght);
}
