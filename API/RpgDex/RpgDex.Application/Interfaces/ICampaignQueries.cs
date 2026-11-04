using RpgDex.Application.Dto;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface ICampaignQueries
    {
        Task<(IEnumerable<Campaign> Campaigns, int Total)> GetAllAsync(Guid userId, int page = 1, int pageSize = 5);
    }
}
