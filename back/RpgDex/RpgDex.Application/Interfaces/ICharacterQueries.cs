using RpgDex.Domain.Entities;
using RpgDex.Application.Dto;
using RpgDex.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface ICharacterQueries
    {
        Task<(IEnumerable<Character> Characters, int Total)> GetAllByUserIdAsync(Guid userId);
        Task<(IEnumerable<Character> Characters, int Total)> GetAllByUserIdAsync(Guid userId, int page = 1, int pageSize = 5);
        Task<(IEnumerable<Character> Characters, int Total)> GetPlayerCharactersFromCampaign(Guid userId, Guid campaignId);

        Task<ChartResponse> GetCharacterChart(DateTime startDate, DateTime endDate);
    }
}
