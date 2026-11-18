using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface IUserDocumentRepository
    {
        Task<UserDocument> InsertAsync(UserDocument userDocument);
        Task<UserDocument> GetByIdAsync(Guid id, Guid userId);
        Task<bool> UpdateAsync(UserDocument newUserDocument);
        Task<bool> SetActiveStateAsync(Guid Id, bool ActiveState);
        Task<bool> UpdateAccessList(UserDocument newUserDocument);

    }
}
