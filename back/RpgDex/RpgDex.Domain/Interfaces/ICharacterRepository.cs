using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface ICharacterRepository
    {
        Task<Character> InsertAsync(Character character);
        Task<long> GetCharactersCountByUserId(Guid userId);
        Task<Character> GetByIdAsync(Guid id);
        Task<bool> UpdateAsync(Character NewCharacter);
        Task<bool> SetActiveState(Guid Id,bool ActiveState);
        Task<bool> UpdateLastAccessAsync(Guid id, DateTime DateNow);


    }

}
