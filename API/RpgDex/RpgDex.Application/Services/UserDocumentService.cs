using RpgDex.Application.Common;
using RpgDex.Application.Dto;
using RpgDex.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Services
{
    public class UserDocumentService : IUserDocumentService
    {
        public Task<Result<UserDocumentResponse>> Create(string userId, CreateUserDocument request)
        {
            throw new NotImplementedException();
        }

        public Task<Result<IEnumerable<UserDocumentResponse>>> GetAllByUserId(string userId)
        {
            throw new NotImplementedException();
        }

        public Task<Result<IEnumerable<UserDocumentResponse>>> GetAllByUserId(string userId, int page, int pageSize)
        {
            throw new NotImplementedException();
        }

        public Task<Result<UserDocumentResponse>> GetById(Guid id)
        {
            throw new NotImplementedException();
        }

        public Task<Result<bool>> SetActiveState(string userId, UserDocumentSetActiveStateRequest request)
        {
            throw new NotImplementedException();
        }

        public Task<Result<UserDocumentResponse>> Update(string userId, UpdateUserDocumentRequest request)
        {
            throw new NotImplementedException();
        }
    }
}
