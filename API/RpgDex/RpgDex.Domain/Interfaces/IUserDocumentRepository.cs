using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface IUserDocumentRepository
    {
        Task<UserDocument> InsertAsync(UserDocument userDocument);
        Task<IEnumerable<UserDocument>> GetAllAsync(Guid userId, int page = 1, int pageSize = 5);
        Task<UserDocument> GetByIdAsync(Guid id);
        Task<bool> UpdateAsync(UserDocument newUserDocument);
        Task<bool> SetActiveState(Guid Id, bool ActiveState);
    }
}
