using FluentValidation;
using Mapster;
using Microsoft.AspNetCore.Identity;
using RpgDex.Domain.Common;
using RpgDex.Application.Dto;
using RpgDex.Application.Extension;
using RpgDex.Application.Interfaces;
using RpgDex.Application.Validators;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Text;
using Microsoft.Extensions.Logging;


namespace RpgDex.Application.Services
{
    public class CharacterService(ICharacterRepository characterRepository, IUserRepository userRepository,
        IFileService fileService, IValidator<CreateCharacterRequest> createCharacterRequestValidator, ISubscriptionService subscritpionService,
        IValidator<UpdateCharacterRequest> updateCharacterRequestValidator, ICharacterQueries characterQueries) : ICharacterService
    {

        public async Task<Result<CharacterResponse>> Create(string userId,CreateCharacterRequest request)
        {
            var checkCharacterValid = createCharacterRequestValidator.Validate(request);
            if (!checkCharacterValid.IsValid) return checkCharacterValid.ReturnErrors<CharacterResponse>();
            if (!Guid.TryParse(userId, out var guidUserId)) return Result<CharacterResponse>.Failure(Error.InvalidUserId);

            if (await CheckCharacterLimit(guidUserId)) return Result<CharacterResponse>.Failure(CharacterError.LimitExceed);
            //Converts request to character
            var character = request.Adapt<Character>();
            character.Id = Guid.NewGuid();

            //Verifies if user exists
            var user = await userRepository.GetByIdAsync(guidUserId);
            if (user is null) return Result<CharacterResponse>.Failure(AuthError.UserNotFound);


            character.UserId = guidUserId;


            if (request.Icon is not null)
            {
                // Icon save
                try
                {
                    character.IconPath = await fileService.UploadFileAsync(request.Icon, character.Id.ToString());
                }
                catch
                {
                    return Result<CharacterResponse>.Failure(Error.UploadImageFailed);
                }
            }
            
            // push character to database
            var response = await characterRepository.InsertAsync(character);

            //push character to user list
            var data = await userRepository.PushCharacterAsync(guidUserId, response.Id);
            if (!data) return Result<CharacterResponse>.Failure(CharacterError.PushToUserFailed);

            return Result<CharacterResponse>.Success(response.Adapt<CharacterResponse>());
        }

        public async Task<Result<CharacterResponse>> SetActiveState(Guid Id, bool ActiveState)
        {
            //Verifies if character exists
            var characterFound = await characterRepository.GetByIdAsync(Id);
            if(characterFound is null) return Result<CharacterResponse>.Failure(CharacterError.NotFound);

            //Verifies if character is deactivated
            bool modified = await characterRepository.SetActiveState(Id,ActiveState);
            if (!modified) return Result<CharacterResponse>.Failure(CharacterError.SetActiveStateFailed);

            //Verifies if the character is removed
            //bool deletedFromUser = await _userRepository.PullCharacterAsync(characterFound.UserId, Id);
            //if (!deletedFromUser)
            //{
            //    return Result<CharacterResponse>.Failure("Falha ao desativar personagem do usuario");
            //}
            return Result<CharacterResponse>.Success(characterFound.Adapt<CharacterResponse>());
        }

        public async Task<Result<GetAllCharacterResponse>> GetAllByUserIdAsync(string userId, int page, int pageSize)
        {
            if (!Guid.TryParse(userId, out var guidUserId)) return Result<GetAllCharacterResponse>.Failure(Error.InvalidUserId);

            //Return all characters
            var result =  await characterQueries.GetAllByUserIdAsync(guidUserId,page,pageSize);
            if (result.Characters is null) return Result<GetAllCharacterResponse>.Failure(CharacterError.NotFound);
            var limit = await subscritpionService.GetSubscritptionLimits(userId.ToString());

            var response = new GetAllCharacterResponse(result.Characters.Adapt<IEnumerable<CharacterResponse>>(),limit.Value!.CharacterQty, result.Total);
            return  Result<GetAllCharacterResponse>.Success(response);
        }
        public async Task<Result<GetAllCharacterResponse>> GetAllFromCampaign(string userId, Guid campaignId)
        {
            if (!Guid.TryParse(userId, out var guidUserId)) return Result<GetAllCharacterResponse>.Failure(Error.InvalidUserId);

            //Return all characters
            var result = await characterQueries.GetPlayerCharactersFromCampaign(guidUserId,campaignId);
            if (result.Characters is null) return Result<GetAllCharacterResponse>.Failure(CharacterError.NotFound);
            var limit = await subscritpionService.GetSubscritptionLimits(userId.ToString());

            var response = new GetAllCharacterResponse(result.Characters.Adapt<IEnumerable<CharacterResponse>>(), limit.Value!.CharacterQty, result.Total);
            return Result<GetAllCharacterResponse>.Success(response);
        }

        public async Task<Result<GetAllCharacterResponse>> GetAllByUserIdAsync(string userId)
        {
            if (!Guid.TryParse(userId, out var guidUserId)) return Result<GetAllCharacterResponse>.Failure(Error.InvalidUserId);

            //Return all characters
            var result = await characterQueries.GetAllByUserIdAsync(guidUserId);
            if (result.Characters is null) return Result<GetAllCharacterResponse>.Failure(CharacterError.NotFound);

            var limit = await subscritpionService.GetSubscritptionLimits(userId.ToString());

            var response = new GetAllCharacterResponse(result.Characters.Adapt<IEnumerable<CharacterResponse>>(), limit.Value!.CharacterQty, result.Total);
            return Result<GetAllCharacterResponse>.Success(response);
        }
        public async Task<Result<CharacterResponse>> GetByIdAsync(Guid Id)
        {
            //Return a character
            var data = await characterRepository.GetByIdAsync(Id);
            if(data is null)
            {
                return Result<CharacterResponse>.Failure(CharacterError.NotFound);
            }
            
            var response = data.Adapt<CharacterResponse>();
            return Result<CharacterResponse>.Success(response);
        }

        public async Task<Result<bool>> UpdateAsync(string userId, UpdateCharacterRequest request)
        {
           var checkUpdateCharacterRequest = updateCharacterRequestValidator.Validate(request);
            if (!checkUpdateCharacterRequest.IsValid) return checkUpdateCharacterRequest.ReturnErrors<bool>();

            var updateCharacter = request.Adapt<Character>();

            //Verifies if Character is really from user
            if (!Guid.TryParse(userId, out var guidUserId)) return Result<bool>.Failure(Error.InvalidUserId);
            var characterFound = await characterRepository.GetByIdAsync(request.Id);

            if (!guidUserId.Equals(characterFound.UserId)) return Result<bool>.Failure(CharacterError.CharacterNotOwned);

            if (request.Icon is not null)
            {
                try
                {
                    updateCharacter.IconPath = await fileService.UploadFileAsync(request.Icon, updateCharacter.Id.ToString());
                }
                catch
                {
                    return Result<bool>.Failure(Error.UploadImageFailed);
                }
            }
            else
            {
              
                if (characterFound is null) return Result<bool>.Failure(CharacterError.NotFound);
                updateCharacter.IconPath = characterFound.IconPath;
            }


            var response = await characterRepository.UpdateAsync(updateCharacter);
            //Verifies if character was updated
            if (!response) return Result<bool>.Failure(CharacterError.UpdateFailed);
            return Result<bool>.Success(response);
        }

        public async Task<Result<bool>> UpdateLastAccess(Guid id)
        {
            var character = await characterRepository.GetByIdAsync(id);
            if (character is null) return Result<bool>.Failure(CharacterError.NotFound);


            var isSuccess = await characterRepository.UpdateLastAccessAsync(id,DateTime.Now);
            if (!isSuccess)
            {
                return Result<bool>.Failure(CharacterError.UpdateLastAccessFailed);
            }
            return Result<bool>.Success(true);
        }

        private async Task<bool> CheckCharacterLimit(Guid userId)
        {
            var limit = await subscritpionService.GetSubscritptionLimits(userId.ToString());
            var characterCount = await characterRepository.GetCharactersCountByUserId(userId);

            if (characterCount < limit.Value!.CharacterQty)
            {
                return false;
            }
            return true;
        }
    }
}
