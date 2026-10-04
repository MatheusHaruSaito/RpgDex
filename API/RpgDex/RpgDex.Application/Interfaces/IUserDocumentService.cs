using RpgDex.Application.Common;
using RpgDex.Application.Dto;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface IUserDocumentService
    {
        public Task<Result<UserDocumentResponse>> Create(string userId, CreateUserDocumentRequest request);
        public Task<Result<IEnumerable<UserDocumentResponse>>> GetAllByUserId(string userId, int page, int pageSize);

        public Task<Result<UserDocumentResponse>> GetById(Guid id);
        public Task<Result<UserDocumentResponse>> Update(string userId, UpdateUserDocumentRequest request);
        public Task<Result<bool>> SetActiveState(string userId, UserDocumentSetActiveStateRequest request, bool isActive);
        public Task<Result<bool>> UpdateUserAccess(string userId,GiveUserAccessToDocumentRequest request,bool giveAccess );

    }
}
