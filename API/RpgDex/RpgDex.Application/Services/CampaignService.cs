using FluentValidation;
using Mapster;
using Microsoft.AspNetCore.Identity;
using RpgDex.Application.Common;
using RpgDex.Application.Dto;
using RpgDex.Application.Extension;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Domain.ValueObjects;

namespace RpgDex.Application.Services
{
    public class CampaignService(ICampaignRepository campaignRepository, IFileService fileService, IUserRepository userRepository,
        ICharacterRepository characterRepository, IPasswordHasher<Campaign> passwordHasher,
        IValidator<CreateCampaignRequest> createCampaignRequestValidator, IValidator<UpdateCampaignRequest> updateCampaignRequestValidator, 
        ICampaignChatService campaignChatService, ICampaignChatRepository campaignChatRepository,
        IValidator<CampaignChatMessageRequest> campaignChatMessageValidator) : ICampaignService
    {
        private string? HashPassword(Campaign campaign, string? password)
        {
            if (string.IsNullOrWhiteSpace(password))
            {
                return null;
            }
            return passwordHasher.HashPassword(campaign, password);
        }
        private bool ValidatePassword(Campaign campaign, string password)
        {
            if (string.IsNullOrEmpty(campaign.PasswordHash))
                return true;

            if (string.IsNullOrEmpty(password))
                return false;

            var result = passwordHasher.VerifyHashedPassword(campaign, campaign.PasswordHash, password);

            if (result == PasswordVerificationResult.Failed) return false;

            if (result == PasswordVerificationResult.SuccessRehashNeeded)
            {
                campaign.SetPasswordHash(HashPassword(campaign, password));
            }
            return true;
        }
        public async Task<Result<CampaignResponse>> Create(string userId, CreateCampaignRequest request)
        {
            var checkCreateCampaignRequest = createCampaignRequestValidator.Validate(request);
            if (!checkCreateCampaignRequest.IsValid) return checkCreateCampaignRequest.ReturnErrors<CampaignResponse>();

            if (!Guid.TryParse(userId, out var guidUserId)) return Result<CampaignResponse>.Failure(Error.InvalidUserId);

            var userExisits = await userRepository.GetByIdAsync(guidUserId);
            if (userExisits is null)
            {
                return Result<CampaignResponse>.Failure(AuthError.UserNotFound);
            }

            var campaign = request.Adapt<Campaign>();
            campaign.GameMasterId = guidUserId;
            campaign.SetPasswordHash(HashPassword(campaign, request.Password));
            //Temporary, change when subscriptions are defined
            if (request.MaxPlayers > 15)
            {
                campaign.MaxPlayers = 15;
            }
            //Save Icon, if it exists
            if (request.Icon is not null)
            {
                try
                {
                    campaign.IconPath = await fileService.UploadFileAsync(request.Icon, campaign.Id.ToString());
                }
                catch
                {
                    return Result<CampaignResponse>.Failure(Error.UploadImageFailed);
                }
            }

            var result = await campaignRepository.InsertAsync(campaign);
            if (result is null)
            {
                return Result<CampaignResponse>.Failure(CampaignError.CreateFailed);
            }
            var chatResult = await campaignChatRepository.InsertAsync(new CampaignChat(result.Id));
            if (chatResult is null)
            {
                return Result<CampaignResponse>.Failure(CampaignError.CreateFailed);
            }
            return Result<CampaignResponse>.Success(result.Adapt<CampaignResponse>());
        }
        public async Task<Result<GetAllCampaignResponse>> GetAllByUserId(string userId)
        {
            if (!Guid.TryParse(userId, out var guidUserId)) return Result<GetAllCampaignResponse>.Failure(Error.InvalidUserId);
            var user = await userRepository.GetByIdAsync(guidUserId);
            if (user is null)
            {
                return Result<GetAllCampaignResponse>.Failure(AuthError.UserNotFound);
            }

            var result = await campaignRepository.GetAllAsync(guidUserId);
            var response = new GetAllCampaignResponse(result.Adapt<IEnumerable<CampaignResponse>>(), result.campaignLenght);
            return Result<GetAllCampaignResponse>.Success(response);
        }
        public async Task<Result<GetAllCampaignResponse>> GetAllByUserId(string userId, int page, int pageSize)
        {
            if (!Guid.TryParse(userId, out var guidUserId)) return Result<GetAllCampaignResponse>.Failure(Error.InvalidUserId);
            var user = await userRepository.GetByIdAsync(guidUserId);
            if (user is null)
            {
                return Result<GetAllCampaignResponse>.Failure(AuthError.UserNotFound);
            }

            var result = await campaignRepository.GetAllAsync(guidUserId, page, pageSize);
            var response = new GetAllCampaignResponse(result.campaign.Adapt<IEnumerable<CampaignResponse>>(), result.campaignLenght);
            return Result<GetAllCampaignResponse>.Success(response);
        }


        public async Task<Result<CampaignResponse>> GetById(Guid id)
        {
            var response = await campaignRepository.GetByIdAsync(id);
            if (response is null)
            {
                return Result<CampaignResponse>.Failure(CampaignError.NotFound);
            }

            return Result<CampaignResponse>.Success(response.Adapt<CampaignResponse>());
        }

        public async Task<Result<CampaignResponse>> Update(string userId, UpdateCampaignRequest request)
        {
            var checkupdateCampaignRequest = updateCampaignRequestValidator.Validate(request);
            if (!checkupdateCampaignRequest.IsValid) return checkupdateCampaignRequest.ReturnErrors<CampaignResponse>();

            if (!Guid.TryParse(userId, out var guidUserId)) return Result<CampaignResponse>.Failure(Error.InvalidUserId);

            var campaign = await campaignRepository.GetByIdAsync(request.Id);
            if (campaign is null)
            {
                return Result<CampaignResponse>.Failure(CampaignError.NotFound);
            }

            if (!campaign.GameMasterId.Equals(guidUserId)) return Result<CampaignResponse>.Failure(CampaignError.NotGameMaster);

            if (campaign.PlayerIds.Count() > request.MaxPlayers)
            {
                return Result<CampaignResponse>.Failure(CampaignError.CannotReduceCapacity);
            }

            campaign.Update(request.Title, request.Description, request.MaxPlayers, request.NextSession);

            //Update Icon, if request provides another
            if (request.Icon is not null)
            {
                try
                {
                    campaign.IconPath = await fileService.UploadFileAsync(request.Icon, campaign.Id.ToString());
                }
                catch
                {
                    return Result<CampaignResponse>.Failure(Error.UploadImageFailed);
                }
            }

            var result = await campaignRepository.UpdateAsync(campaign);

            if (result is null)
            {
                return Result<CampaignResponse>.Failure(CampaignError.UpdateFailed);
            }

            return Result<CampaignResponse>.Success(result.Adapt<CampaignResponse>());
        }

        public async Task<Result<bool>> SetActiveState(string userId, CampaignSetActiveStateRequest request)
        {

            var campaign = await campaignRepository.GetByIdAsync(request.Id);
            if (campaign is null)
            {
                return Result<bool>.Failure(CampaignError.NotFound);
            }

            if (!Guid.TryParse(userId, out var guidUserId)) return Result<bool>.Failure(Error.InvalidUserId);
            if (!campaign.GameMasterId.Equals(guidUserId)) return Result<bool>.Failure(CampaignError.NotGameMaster);

            var result = await campaignRepository.SetActiveState(request.Id, request.State);
            if (!result)
            {
                return Result<bool>.Failure(CampaignError.UpdateFailed);
            }
            return Result<bool>.Success(result);
        }

        //REFACTTOR: this method will require a refactor after mergin with chatVerificationBranch
        //Change Those TryAdd messages
        public async Task<Result<string>> AddPlayer(string userId, JoinCampaignRequest request)
        {
            var campaign = await campaignRepository.GetByIdAsync(request.CampaignId);
            if (campaign is null)
            {
                return Result<string>.Failure(CampaignError.NotFound);
            }
            //Campaign found

            if (!Guid.TryParse(userId, out var guidUserId)) return Result<string>.Failure(Error.InvalidUserId);


            var user = await userRepository.GetByIdAsync(guidUserId);
            if (user is null)
            {
                return Result<string>.Failure(AuthError.UserNotFound);
            }
            //Player found
            var isValid = ValidatePassword(campaign, request.Password);
            if (!isValid)
            {
                return Result<string>.Failure(CampaignError.InvalidPassword);
            }
            var (message, IsSuccess) = campaign.TryAddPlayer(guidUserId);
            if (!IsSuccess)
            {
                return Result<string>.Failure(Error.RefactorPlaceholder);
            }

            var result = await campaignRepository.UpdateAsync(campaign);
            if (result is null)
            {
                return Result<string>.Failure(CampaignError.UpdateFailed);
            }

            return Result<string>.Success("Player added to campaign successfully");
        }
        //REFACTTOR: this method will require a refactor after mergin with chatVerificationBranch
        //Change Those TryAdd messages
        public async Task<Result<string>> AddCharacter(string userId, AddCharacterToCampaignRequest request)
        {
            var characterFound = await characterRepository.GetByIdAsync(request.CharacterId);
            if (characterFound is null)
            {
                return Result<string>.Failure(CharacterError.NotFound);
            }
            //Character found

            if (!Guid.TryParse(userId, out var guidUserId)) return Result<string>.Failure(Error.InvalidUserId);
            if (!characterFound.UserId.Equals(guidUserId)) return Result<string>.Failure(CharacterError.CharacterNotOwned);

            var campaignFound = await campaignRepository.GetByIdAsync(request.CampaignId);
            if (campaignFound is null)
            {
                return Result<string>.Failure(CampaignError.NotFound);
            }
            //Campaign found
            var (message, IsSuccess) = campaignFound.TryAddCharacter(request.CharacterId);
            if (!IsSuccess)
            {
                return Result<string>.Failure(Error.RefactorPlaceholder);
            }


            var updatedCampaign = await campaignRepository.UpdateAsync(campaignFound);
            if (updatedCampaign is null)
            {
                return Result<string>.Failure(CampaignError.UpdateFailed);
            }
            return Result<string>.Success(message);
        }
        //REFACTTOR: this method will require a refactor after mergin with chatVerificationBranch
        //Change Those TryAdd messages
        public async Task<Result<string>> RemoveCharacter(string userId, RemoveCharacterFromCapaignRequest request)
        {
            var characterFound = await characterRepository.GetByIdAsync(request.CharacterId);
            if (characterFound is null)
            {
                return Result<string>.Failure(CharacterError.NotFound);
            }
            //Character found

            var campaignFound = await campaignRepository.GetByIdAsync(request.CampaignId);
            if (campaignFound is null)
            {
                return Result<string>.Failure(CampaignError.NotFound);
            }
            //Campaign found

            if (!Guid.TryParse(userId, out var guidUserId)) return Result<string>.Failure(Error.InvalidUserId);

            var isUserGameMaster = campaignFound.GameMasterId.Equals(guidUserId);
            if (!isUserGameMaster)
            {
                return Result<string>.Failure(CampaignError.NotGameMaster);
            }

            (string message, bool isSuccess) characterRemoved;

            characterRemoved = campaignFound.TryRemoveCharacter(request.CharacterId);

            if (!characterRemoved.isSuccess)
            {
                return Result<string>.Failure(Error.RefactorPlaceholder);
            }

            //Character accepted into campaign

            var updatedCampaign = await campaignRepository.UpdateAsync(campaignFound);
            if (updatedCampaign is null)
            {
                return Result<string>.Failure(CampaignError.UpdateFailed);
            }
            return Result<string>.Success(characterRemoved.message);
        }
        //REFACTTOR: this method will require a refactor after mergin with chatVerificationBranch
        //Change Those TryAdd messages
        public async Task<Result<string>> AcceptCharacter(string userId, AcceptCharacterToCampaignRequest request)
        {
            var characterFound = await characterRepository.GetByIdAsync(request.CharacterId);
            if (characterFound is null)
            {
                return Result<string>.Failure(CharacterError.NotFound);
            }
            //Character found

            var campaignFound = await campaignRepository.GetByIdAsync(request.CampaignId);
            if (campaignFound is null)
            {
                return Result<string>.Failure(CampaignError.NotFound);
            }
            //Campaign found

            if (!Guid.TryParse(userId, out var guidUserId)) return Result<string>.Failure(Error.InvalidUserId);

            var isUserGameMaster = campaignFound.GameMasterId.Equals(guidUserId);
            if (!isUserGameMaster)
            {
                return Result<string>.Failure(CampaignError.NotGameMaster);
            }

            (string message, bool isSuccess) chracterAdded;

            if (request.IsAccepted)
            {
                chracterAdded = campaignFound.TryAcceptCharacter(request.CharacterId);
            }
            else
            {
                chracterAdded = campaignFound.TryRejectCharacter(request.CharacterId);
            }

            if (!chracterAdded.isSuccess)
            {
                return Result<string>.Failure(Error.RefactorPlaceholder);
            }

            //Character accepted into campaign

            var updatedCampaign = await campaignRepository.UpdateAsync(campaignFound);
            if (updatedCampaign is null)
            {
                return Result<string>.Failure(CampaignError.UpdateFailed);
            }
            return Result<string>.Success(chracterAdded.message);
        }
        //REFACTTOR: this method will require a refactor after mergin with chatVerificationBranch
        //Change Those TryAdd messages
        public async Task<Result<string>> RemovePlayer(string userId, RemovePlayerFromCampaignRequest request)
        {
            var campaignFound = await campaignRepository.GetByIdAsync(request.CampaignId);
            if (campaignFound is null)
            {
                return Result<string>.Failure(CampaignError.NotFound);
            }
            if (!Guid.TryParse(userId, out var guidUserId)) return Result<string>.Failure(Error.InvalidUserId);

            //User found
            var isUserGameMaster = campaignFound.GameMasterId.Equals(guidUserId);
            if (!isUserGameMaster)
            {
                return Result<string>.Failure(CampaignError.NotGameMaster);
            }
            if (!campaignFound.PlayerIds.Contains(request.PlayerId))
            {
                return Result<string>.Failure(CampaignError.PlayerNotFound);
            }
            //Player to be kicked found
            var (message, IsSuccess) = campaignFound.TryRemovePlayer(request.PlayerId);
            if (!IsSuccess)
            {
                return Result<string>.Failure(Error.RefactorPlaceholder);
            }
            //Try to remove user characters from campaign
            var userFound = await userRepository.GetByIdAsync(request.PlayerId);
            if (userFound is not null && userFound.CharactersId is not null)
            {

                var charactersToRemove = userFound.CharactersId
                    .Intersect(campaignFound.CharacterIds)
                    .ToList();
                var charactersRequestToRemove = userFound.CharactersId
                    .Intersect(campaignFound.CharacterRequests)
                    .ToList();
                foreach (var characterId in charactersToRemove)
                {
                    campaignFound.TryRemoveCharacter(characterId);
                }
                foreach (var characterId in charactersRequestToRemove)
                {
                    campaignFound.TryRejectCharacter(characterId);
                }
            }

            var updatedCampaign = await campaignRepository.UpdateAsync(campaignFound);
            if (updatedCampaign is null)
            {
                return Result<string>.Failure(CampaignError.UpdateFailed);
            }

            return Result<string>.Success(message);
        }
        //REFACTTOR: this method will require a refactor after mergin with chatVerificationBranch
        //Change Those TryAdd messages
        public async Task<Result<string>> LeaveCampaign(string userId, LeaveCampaignRequest request)
        {
            if (!Guid.TryParse(userId, out Guid userIdGuid)) return Result<string>.Failure(Error.InvalidUserId);

            var campaignFound = await campaignRepository.GetByIdAsync(request.CampaignId);
            if(campaignFound is null)
            {
                return Result<string>.Failure(CampaignError.NotFound);
            }
            //Verifies if user is game master
            if (campaignFound.GameMasterId.Equals(userIdGuid))
            {
                return Result<string>.Failure(CampaignError.GameMasterCannotLeave);
            }
            //Verifies if user is in the campaign
            if (!campaignFound.PlayerIds.Contains(userIdGuid))
            {
                return Result<string>.Failure(CampaignError.NotAPlayer);
            }

            var (message, isSuccess) = campaignFound.TryRemovePlayer(userIdGuid);
            if (!isSuccess)
            {
                return Result<string>.Failure(Error.RefactorPlaceholder);
            }

            //Try to remove user characters from campaign
            var userFound = await userRepository.GetByIdAsync(userIdGuid);

            if (userFound is not null && userFound.CharactersId is not null)
            {

                var charactersToRemove = userFound.CharactersId
                    .Intersect(campaignFound.CharacterIds)
                    .ToList();
                var charactersRequestToRemove = userFound.CharactersId
                    .Intersect(campaignFound.CharacterRequests)
                    .ToList();
                foreach (var characterId in charactersToRemove)
                {
                    campaignFound.TryRemoveCharacter(characterId);
                }
                foreach (var characterId in charactersRequestToRemove)
                {
                    campaignFound.TryRejectCharacter(characterId);
                }
            }

            var updatedCampaign = await campaignRepository.UpdateAsync(campaignFound);
            if (updatedCampaign is null)
            {
                return Result<string>.Failure(CampaignError.UpdateFailed);
            }

            return Result<string>.Success("Successfully left the campaign");

        }
        public async Task<Result<string>> UpdateConfiguration(string userId, UpdateCampaignSettingsRequest request)
        {
            var campaignFound = await campaignRepository.GetByIdAsync(request.CampaignId);
            if (campaignFound is null)
            {
                return Result<string>.Failure(CampaignError.NotFound);
            }

            if (!Guid.TryParse(userId, out var guidUserId)) return Result<string>.Failure(Error.InvalidUserId);
            var isUserGameMaster = campaignFound.GameMasterId.Equals(guidUserId);


            if (!isUserGameMaster)
            {
                return Result<string>.Failure(CampaignError.NotGameMaster);
            }
            campaignFound.UpdateSettings(request.Adapt<CampaignSettings>());
            var updatedCampaign = await campaignRepository.UpdateAsync(campaignFound);
            if (updatedCampaign is null)
            {
                return Result<string>.Failure(CampaignError.UpdateFailed);
            }

            return Result<string>.Success("Campaign settings updated successfully");
        }

        public async Task<Result<string>> SendMessage(string userId, CampaignChatMessageRequest request)
        {
            var checkCampaignChatMessageValidator= campaignChatMessageValidator.Validate(request);
            if (!checkCampaignChatMessageValidator.IsValid) return checkCampaignChatMessageValidator.ReturnErrors<string>();

            if (!Guid.TryParse(userId, out var guidUserId)) return Result<string>.Failure(Error.InvalidUserId);
            var user = await userRepository.GetByIdAsync(guidUserId);
            if (user is null)
            {
                return Result<string>.Failure(AuthError.UserNotFound);
            }


            var campaignChat = await campaignChatRepository.GetCampaignChat(request.CampaignId);
            if (campaignChat is null)
            {
                return Result<string>.Failure(CampaignError.ChatNotFound);
            }
            ChatMessage newMessage = new(
                user.Id,
                user.DisplayName,
                user.IconPath,
                request.Message,
                DateTime.UtcNow
                );

            campaignChat.PushCampaignChat(newMessage);
            var result = await campaignChatRepository.UpdateCampaignChatMessage(campaignChat.Id, campaignChat.ChatMessages);
            if (!result)
            {
                return Result<string>.Failure(CampaignError.SaveMessageFailed);
            }
            await campaignChatService.SendMessage(request.CampaignId.ToString(), newMessage.Adapt<CampaignChatMessagesResponse>());

            return Result<string>.Success($"Message sent by {user.DisplayName} : {request.Message}");
        }
        public async Task<Result<IEnumerable<CampaignChatMessagesResponse>>> GetChatMessages(Guid campaignId)
        {
            //needs more verification
            var campaignChat = await campaignChatRepository.GetCampaignChat(campaignId);
            if (campaignChat is null)
            {
                var newcampaignChat = await campaignChatRepository.InsertAsync(new CampaignChat(campaignId));
                if (newcampaignChat is null)
                {
                    return Result<IEnumerable<CampaignChatMessagesResponse>>.Failure(CampaignError.ChatNotFound);
                }
                var newMessages = campaignChat.ChatMessages.Adapt<IEnumerable<CampaignChatMessagesResponse>>();
                return Result<IEnumerable<CampaignChatMessagesResponse>>.Success(newMessages);

            }
            var messages = campaignChat.ChatMessages.Adapt<IEnumerable<CampaignChatMessagesResponse>>();
            return Result<IEnumerable<CampaignChatMessagesResponse>>.Success(messages);
        }


    }
}
