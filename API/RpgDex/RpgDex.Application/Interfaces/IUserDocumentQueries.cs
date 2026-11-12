using RpgDex.Application.Dto.UserDocument;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface IUserDocumentQueries
    {
        Task<decimal> GetDocumentStorageInMbByUserId(Guid userId);
        Task<GetAllUserDocumentResponse> GetAllAsync(Guid userId, int page = 1, int pageSize = 5);

    }
}
