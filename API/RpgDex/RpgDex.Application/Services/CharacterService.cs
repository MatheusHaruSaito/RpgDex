using FluentValidation;
using Mapster;
using Microsoft.AspNetCore.Identity;
using RpgDex.Application.Common;
using RpgDex.Application.Dto;
using RpgDex.Application.Extension;
using RpgDex.Application.Interfaces;
using RpgDex.Application.Validators;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Text;


namespace RpgDex.Application.Services
{
    public class CharacterService(ICharacterRepository character, IUserRepository userRepository,
        IFileService fileService, IValidator<CreateCharacterRequest> createCharacterRequestValidator,
        IValidator<UpdateCharacterRequest> updateCharacterRequestValidator) : ICharacterService
    {
        private readonly ICharacterRepository _character = character;

        public async Task<Result<CharacterResponse>> Create(string userId,CreateCharacterRequest request)
        {
            var checkCharacterValid = createCharacterRequestValidator.Validate(request);
            if (!checkCharacterValid.IsValid) return checkCharacterValid.ReturnErrors<CharacterResponse>();
            //Converts request to character
            var character = request.Adapt<Character>();
            character.Id = Guid.NewGuid();

            if (!Guid.TryParse(userId, out var guidUserId)) return Result<CharacterResponse>.Failure(Error.InvalidUserId);

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
            var response = await _character.InsertAsync(character);

            //push character to user list
            var data = await userRepository.PushCharacterAsync(guidUserId, response.Id);
            if (!data) return Result<CharacterResponse>.Failure(CharacterError.PushToUserFailed);

            return Result<CharacterResponse>.Success(response.Adapt<CharacterResponse>());
        }

        public async Task<Result<CharacterResponse>> SetActiveState(Guid Id, bool ActiveState)
        {
            //Verifies if character exists
            var characterFound = await _character.GetByIdAsync(Id);
            if(characterFound is null) return Result<CharacterResponse>.Failure(CharacterError.NotFound);

            //Verifies if character is deactivated
            bool modified = await _character.SetActiveState(Id,ActiveState);
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
            var result =  await _character.GetAllByUserIdAsync(guidUserId,page,pageSize);
            if (result is null) return Result<GetAllCharacterResponse>.Failure(CharacterError.NotFound);

            var response = new GetAllCharacterResponse(result.Characters.Adapt<IEnumerable<CharacterResponse>>(),result.CharactersLenght);
            return  Result<GetAllCharacterResponse>.Success(response);
        }
        public async Task<Result<GetAllCharacterResponse>> GetAllByUserIdAsync(string userId)
        {
            if (!Guid.TryParse(userId, out var guidUserId)) return Result<GetAllCharacterResponse>.Failure(Error.InvalidUserId);

            //Return all characters
            var result = await _character.GetAllByUserIdAsync(guidUserId);
            if (result is null) return Result<GetAllCharacterResponse>.Failure(CharacterError.NotFound);
            var response = new GetAllCharacterResponse(result.Characters.Adapt<IEnumerable<CharacterResponse>>(),result.CharactersLenght);
            return Result<GetAllCharacterResponse>.Success(response);
        }
        public async Task<Result<CharacterResponse>> GetByIdAsync(Guid Id)
        {
            //Return a character
            var data = await _character.GetByIdAsync(Id);
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
            var characterFound = await _character.GetByIdAsync(request.Id);

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


            var response = await _character.UpdateAsync(updateCharacter);
            //Verifies if character was updated
            if (!response) return Result<bool>.Failure(CharacterError.UpdateFailed);
            return Result<bool>.Success(response);
        }

        public async Task<Result<bool>> UpdateLastAccess(Guid id)
        {
            var character = await _character.GetByIdAsync(id);
            if (character is null) return Result<bool>.Failure(CharacterError.NotFound);


            var isSuccess = await _character.UpdateLastAccessAsync(id,DateTime.Now);
            if (!isSuccess)
            {
                return Result<bool>.Failure(CharacterError.UpdateLastAccessFailed);
            }
            return Result<bool>.Success(true);
        }
    }
}
