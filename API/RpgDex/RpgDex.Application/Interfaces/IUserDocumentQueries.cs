using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface IUserDocumentQueries
    {
        Task<decimal> GetDocumentStorageInMbByUserId(Guid userId);
    }
}
