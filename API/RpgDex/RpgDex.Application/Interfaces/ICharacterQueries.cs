using RpgDex.Application.Dto.Character;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface ICharacterQueries
    {
        Task<CharacterChartResponse> GetCharacterChart(DateTime startDate, DateTime endDate);

    }
}
