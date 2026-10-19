using RpgDex.Domain.Common;
using RpgDex.Application.Dto;
using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface ICharacterService
    {
        Task<Result<CharacterResponse>> Create(string userId,CreateCharacterRequest request);
        Task<Result<GetAllCharacterResponse>> GetAllByUserIdAsync(string userId);
        Task<Result<GetAllCharacterResponse>> GetAllByUserIdAsync(string userId, int page = 1, int pageSize = 3);
        Task<Result<CharacterResponse>> GetByIdAsync(Guid Id);
        Task<Result<bool>> UpdateAsync(string userId, UpdateCharacterRequest request);
        Task<Result<CharacterResponse>> SetActiveState(Guid Id,bool ActiveState);
        Task<Result<bool>> UpdateLastAccess(Guid id);

    }
}
