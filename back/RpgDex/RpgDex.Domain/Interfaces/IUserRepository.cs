using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface IUserRepository
    {
        Task<bool> PushCharacterAsync(Guid userId, Guid characterID);
        Task<bool> PullCharacterAsync(Guid userId, Guid characterId);
        Task<ApplicationUser> GetByIdAsync(Guid userId);
        Task<bool> ExistsByCpfHashAsync(string cpfHash, Guid excludeUserId);
        Task<List<string>> GetAllProfilePhotoIdsAsync(CancellationToken ct = default);
        Task<IEnumerable<ApplicationUser>> GetAllByEmailOrUserNameAsync(string target, int page, int pageSize);

    }
}
