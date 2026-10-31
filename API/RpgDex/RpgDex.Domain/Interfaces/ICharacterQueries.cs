using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface ICharacterQueries
    {
        Task<GetAllCharactersResult> GetPlayerCharactersFromCampaign(Guid userId, Guid campaignId);
    }
}
