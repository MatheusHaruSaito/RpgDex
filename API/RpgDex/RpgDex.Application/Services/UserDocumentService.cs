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
        IValidator<CreateUserDocumentRequest> createUserDocumentValidator,
        IValidator<UpdateUserDocumentRequest> updateUserDocumentValidator) : IUserDocumentService
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

        public async Task<Result<UserDocumentResponse>> GetById(string userId, Guid id)
        {
            if (!Guid.TryParse(userId, out var userGuidId)) return Result<UserDocumentResponse>.Failure(Error.InvalidUserId);

            var result = await userDocumentRepository.GetByIdAsync(id, userGuidId);
            if(result is null) return Result<UserDocumentResponse>.Failure(UserDocumentError.NotFound);
            return Result<UserDocumentResponse>.Success(result.Adapt<UserDocumentResponse>());
        }

        public async Task<Result<bool>> SetActiveState(string userId, UserDocumentSetActiveStateRequest request, bool isActive)
        {
            if (!Guid.TryParse(userId, out var userGuidId)) return Result<bool>.Failure(Error.InvalidUserId);
            Console.WriteLine(request.Id);
            Console.WriteLine(userGuidId);

            var document = await userDocumentRepository.GetByIdAsync(request.Id,userGuidId);
            if(document is null) return Result<bool>.Failure(UserDocumentError.NotFound);
            //Temporary, refactor when merge to main.
            if(!document.IsActive) return Result<bool>.Failure(UserDocumentError.NotFound);
            if (document.UserId != userGuidId) return Result<bool>.Failure(UserDocumentError.NotOwned);

            var result = await userDocumentRepository.SetActiveStateAsync(request.Id, isActive);
            return Result<bool>.Success(result);
        }

        public async Task<Result<UserDocumentResponse>> Update(string userId, UpdateUserDocumentRequest request)
        {
            var checkUpdateUserDocumentValidator = updateUserDocumentValidator.Validate(request);
            if (!checkUpdateUserDocumentValidator.IsValid) return checkUpdateUserDocumentValidator.ReturnErrors<UserDocumentResponse>();
            if (!Guid.TryParse(userId, out var userGuidId)) return Result<UserDocumentResponse>.Failure(Error.InvalidUserId);

            var userDocument = await userDocumentRepository.GetByIdAsync(request.Id,userGuidId);
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

        public async Task<Result<bool>> UpdateUserAccess(string userId, GiveUserAccessToDocumentRequest request, bool giveAccess)
        {
            if (!Guid.TryParse(userId, out var userGuidId)) return Result<bool>.Failure(Error.InvalidUserId);
            var document = await userDocumentRepository.GetByIdAsync(request.documentId,userGuidId);
            if (document is null) return Result<bool>.Failure(UserDocumentError.NotFound);

            if (document.UserId != userGuidId) return Result<bool>.Failure(UserDocumentError.NotOwned);

            bool isSuccess;
            //GiveAccess verifies if i'm removing or adding an access
            //Refactor this later when merge with main
            if (giveAccess)
            {
                isSuccess =document.GiveAccess(request.userId);
            }
            else
            {
                isSuccess = document.RemoveAccess(request.userId);
            }
            if (!isSuccess)
            {
                //Temporary Return implement this correctly after merging with main
                return Result<bool>.Failure(UserDocumentError.UpdateFailed);
            }
            var result = await userDocumentRepository.UpdateAccessList(document);
            if (!result)
            {
                return Result<bool>.Failure(UserDocumentError.UpdateFailed);

            }
            return Result<bool>.Success(result);
        }
    }
}
