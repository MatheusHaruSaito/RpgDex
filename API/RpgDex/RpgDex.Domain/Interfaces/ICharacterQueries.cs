using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface ICharacterQueries
    {
        Task<(IEnumerable<Character> Characters, int Total)> GetAllByUserIdAsync(Guid userId);
        Task<(IEnumerable<Character> Characters, int Total)> GetAllByUserIdAsync(Guid userId, int page = 1, int pageSize = 5);
        Task<(IEnumerable<Character> Characters, int Total)> GetPlayerCharactersFromCampaign(Guid userId, Guid campaignId);
    }
}
