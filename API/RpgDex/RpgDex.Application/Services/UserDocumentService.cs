using Mapster;
using RpgDex.Application.Common;
using RpgDex.Application.Dto;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Services
{
    public class UserDocumentService(IUserDocumentRepository userDocumentRepository,IFileService fileService) : IUserDocumentService
    {
        public async Task<Result<UserDocumentResponse>> Create(string userId, CreateUserDocument request)
        {
            if(!Guid.TryParse(userId, out var userGuidId)) return Result<UserDocumentResponse>.Failure("Invalid user ID");
            if (request?.File == null || request.File.Length == 0) return Result<UserDocumentResponse>.Failure("File is required and cannot be empty");

            var fileNameWithoutExtension = Path.GetFileNameWithoutExtension(request.File.FileName);
            var filePath = await fileService.UploadFileAsync(request.File, fileNameWithoutExtension);

            var userDocument = request.Adapt<UserDocument>();
            userDocument.UserId = userGuidId;
            userDocument.FilePath = filePath;
            userDocument.FileName = request.File.FileName;
            userDocument.FileSize = request.File.Length;

            var result = await userDocumentRepository.InsertAsync(userDocument);
            if(result is null) return Result<UserDocumentResponse>.Failure("Failed to create user document");
            return Result<UserDocumentResponse>.Success(result.Adapt<UserDocumentResponse>());
        }

        public async Task<Result<IEnumerable<UserDocumentResponse>>> GetAllByUserId(string userId, int page, int pageSize)
        {
            if (!Guid.TryParse(userId, out var userGuidId)) return Result<IEnumerable<UserDocumentResponse>>.Failure("Invalid user ID");

            var result = await userDocumentRepository.GetAllAsync(userGuidId, page, pageSize);
            return Result<IEnumerable<UserDocumentResponse>>.Success(result.Adapt<IEnumerable<UserDocumentResponse>>());
        }

        public async Task<Result<UserDocumentResponse>> GetById(Guid id)
        {
            var result = await userDocumentRepository.GetByIdAsync(id);
            if(result is null) return Result<UserDocumentResponse>.Failure("User document not found");
            return Result<UserDocumentResponse>.Success(result.Adapt<UserDocumentResponse>());
        }

        public async Task<Result<bool>> SetActiveState(string userId, UserDocumentSetActiveStateRequest request)
        {
            if (!Guid.TryParse(userId, out var userGuidId)) return Result<bool>.Failure("Invalid user ID");

            var document = await userDocumentRepository.GetByIdAsync(request.Id);
            if(document is null) return Result<bool>.Failure("User document not found");

            if(document.UserId != userGuidId)
                return Result<bool>.Failure("User is not the owner of the document");

            var isUserOwner = userId.Equals(document.UserId.ToString());
            if (!isUserOwner) return Result<bool>.Failure("User is not the owner of the document");
            var result = await userDocumentRepository.SetActiveStateAsync(request.Id, request.IsActive);
            return Result<bool>.Success(result);
        }

        public async Task<Result<UserDocumentResponse>> Update(string userId, UpdateUserDocumentRequest request)
        {
            if (!Guid.TryParse(userId, out var userGuidId)) return Result<UserDocumentResponse>.Failure("Invalid user ID");

            var userDocument = await userDocumentRepository.GetByIdAsync(request.Id);
            if (userDocument is null) return Result<UserDocumentResponse>.Failure("User document not found");

            var isUserOwner = userId.Equals(userDocument.UserId.ToString());
            if (!isUserOwner) return Result<UserDocumentResponse>.Failure("User is not the owner of the document");
            userDocument.Name = request.Name;
            userDocument.Description = request.Description;

            if(request.File is not null && request.File.Length > 0)
            {
                var fileNameWithoutExtension = Path.GetFileNameWithoutExtension(request.File.FileName);
                var filePath = await fileService.UploadFileAsync(request.File, fileNameWithoutExtension);
                userDocument.FilePath = filePath;
                userDocument.FileName = request.File.FileName;
                userDocument.FileSize = request.File.Length;
            }

            var result = await userDocumentRepository.UpdateAsync(userDocument);
            return Result<UserDocumentResponse>.Success(result.Adapt<UserDocumentResponse>());
        }
        
    }
}
