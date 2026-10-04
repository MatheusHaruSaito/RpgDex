using FluentValidation;
using Mapster;
using RpgDex.Application.Common;
using RpgDex.Application.Dto;
using RpgDex.Application.Extension;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using SharpCompress.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Services
{
    public class UserDocumentService(IUserDocumentRepository userDocumentRepository,IFileService fileService,
        IValidator<CreateUserDocumentRequest> createUserDocumentValidator) : IUserDocumentService
    {
        public async Task<Result<UserDocumentResponse>> Create(string userId, CreateUserDocumentRequest request)
        {
            var checkCreateUserDocumentValidator = createUserDocumentValidator.Validate(request);
            if (!checkCreateUserDocumentValidator.IsValid) return checkCreateUserDocumentValidator.ReturnErrors<UserDocumentResponse>();
            if (!Guid.TryParse(userId, out var userGuidId)) return Result<UserDocumentResponse>.Failure(Error.InvalidUserId);
            if (request?.File == null || request.File.Length == 0) return Result<UserDocumentResponse>.Failure(UserDocumentError.FileRequired);
            try
            {
                var fileNameWithoutExtension = Path.GetFileNameWithoutExtension(request.File.FileName);
                var filePath = await fileService.UploadFileAsync(request.File, fileNameWithoutExtension);
                var userDocument = request.Adapt<UserDocument>();
                userDocument.UserId = userGuidId;
                userDocument.FilePath = filePath;
                userDocument.FileName = request.File.FileName;
                userDocument.FileSize = request.File.Length;

                var result = await userDocumentRepository.InsertAsync(userDocument);
                if (result is null) return Result<UserDocumentResponse>.Failure(UserDocumentError.CreateFailed);
                return Result<UserDocumentResponse>.Success(result.Adapt<UserDocumentResponse>());
            }
            catch (Exception ex)
            {
                return Result<UserDocumentResponse>.Failure(UserDocumentError.UploadFailed);
            }
        }

        public async Task<Result<IEnumerable<UserDocumentResponse>>> GetAllByUserId(string userId, int page, int pageSize)
        {
            if (!Guid.TryParse(userId, out var userGuidId)) return Result<IEnumerable<UserDocumentResponse>>.Failure(Error.InvalidUserId);

            var result = await userDocumentRepository.GetAllAsync(userGuidId, page, pageSize);
            return Result<IEnumerable<UserDocumentResponse>>.Success(result.Adapt<IEnumerable<UserDocumentResponse>>());
        }

        public async Task<Result<UserDocumentResponse>> GetById(Guid id)
        {
            var result = await userDocumentRepository.GetByIdAsync(id);
            if(result is null) return Result<UserDocumentResponse>.Failure(UserDocumentError.NotFound);
            return Result<UserDocumentResponse>.Success(result.Adapt<UserDocumentResponse>());
        }

        public async Task<Result<bool>> SetActiveState(string userId, UserDocumentSetActiveStateRequest request, bool isActive)
        {
            if (!Guid.TryParse(userId, out var userGuidId)) return Result<bool>.Failure(Error.InvalidUserId);

            var document = await userDocumentRepository.GetByIdAsync(request.Id);
            if(document is null) return Result<bool>.Failure(UserDocumentError.NotFound);

            if(document.UserId != userGuidId) return Result<bool>.Failure(UserDocumentError.NotOwned);

            var result = await userDocumentRepository.SetActiveStateAsync(request.Id, isActive);
            return Result<bool>.Success(result);
        }

        public async Task<Result<UserDocumentResponse>> Update(string userId, UpdateUserDocumentRequest request)
        {
            if (!Guid.TryParse(userId, out var userGuidId)) return Result<UserDocumentResponse>.Failure(Error.InvalidUserId);

            var userDocument = await userDocumentRepository.GetByIdAsync(request.Id);
            if (userDocument is null) return Result<UserDocumentResponse>.Failure(UserDocumentError.NotFound);

            if (userDocument.UserId != userGuidId) return Result<UserDocumentResponse>.Failure(UserDocumentError.NotOwned);

            userDocument.Name = request.Name;
            userDocument.Description = request.Description;

            if(request.File is not null && request.File.Length > 0)
            {
                try
                {
                    var fileNameWithoutExtension = Path.GetFileNameWithoutExtension(request.File.FileName);
                    var filePath = await fileService.UploadFileAsync(request.File, fileNameWithoutExtension);
                    userDocument.FilePath = filePath;
                    userDocument.FileName = request.File.FileName;
                    userDocument.FileSize = request.File.Length;
                }
                catch (Exception ex)
                {
                    return Result<UserDocumentResponse>.Failure(UserDocumentError.UploadFailed);
                }

            }

            var result = await userDocumentRepository.UpdateAsync(userDocument);
            return Result<UserDocumentResponse>.Success(result.Adapt<UserDocumentResponse>());
        }
        
    }
}
