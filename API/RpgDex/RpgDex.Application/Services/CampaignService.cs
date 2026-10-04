using FluentValidation;
using Mapster;
using Microsoft.AspNetCore.Identity;
using RpgDex.Application.Dto;
using RpgDex.Application.Extension;
using RpgDex.Application.Interfaces;
using RpgDex.Application.Validators;
using RpgDex.Domain.Common;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Domain.ValueObjects;
using static RpgDex.Domain.Entities.Campaign;

namespace RpgDex.Application.Services
{
    public class CampaignService(ICampaignRepository campaignRepository, IFileService fileService, IUserRepository userRepository,
        ICharacterRepository characterRepository, IPasswordHasher<Campaign> passwordHasher,
        IValidator<CreateCampaignRequest> createCampaignRequestValidator, IValidator<UpdateCampaignRequest> updateCampaignRequestValidator,
        ICampaignChatService campaignChatService, ICampaignChatRepository campaignChatRepository, IValidator<CampaignChatMessageRequest> campaignChatMessageValidator) : ICampaignService
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


        public async Task<Result<CampaignResponse>> GetById(string userId,Guid id)
        {
            if (!Guid.TryParse(userId, out var guidUserId)) return Result<CampaignResponse>.Failure(Error.InvalidUserId);
            var response = await campaignRepository.GetByIdAsync(id);
            if (response is null)
            {
                return Result<CampaignResponse>.Failure(CampaignError.NotFound);
            }
            var isPlayerInCampaign = response.PlayerIds.Contains(guidUserId)
                | response.GameMasterId.Equals(guidUserId);
            if (!isPlayerInCampaign)
            {
                return Result<CampaignResponse>.Failure(CampaignError.PlayerNotFound);
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

        public async Task<Result<string>> AddPlayer(string userId, JoinCampaignRequest request)
        {
            var campaign = await campaignRepository.GetByIdAsync(request.CampaignId);
            if (campaign is null)
            {
                return Result<string>.Failure(CampaignError.NotFound);
            }
            //Campaign found
            if (!campaign.IsActive)
            {
                return Result<string>.Failure(CampaignError.IsNotActive);
            }
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
            var tryAddPlayerResult = campaign.TryAddPlayer(guidUserId);
            if (!tryAddPlayerResult.IsSuccess)
            {
                return Result<string>.Failure(tryAddPlayerResult.Error!);
            }

            var result = await campaignRepository.UpdateAsync(campaign);
            if (result is null)
            {
                return Result<string>.Failure(CampaignError.UpdateFailed);
            }

            return Result<string>.Success(tryAddPlayerResult.Message!);
        }

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
            var isGameMaster = campaignFound.GameMasterId.Equals(guidUserId);
            if (!isGameMaster && !campaignFound.IsActive)
            {
                return Result<string>.Failure(CampaignError.IsNotActive);
            }
            //Campaign found

            if (!characterFound.UserId.Equals(guidUserId)) return Result<string>.Failure(CharacterError.CharacterNotOwned);

            var tryAddCharacterResult = campaignFound.TryAddCharacter(request.CharacterId);
            if (!tryAddCharacterResult.IsSuccess)
            {
                return Result<string>.Failure(tryAddCharacterResult.Error!);
            }


            var updatedCampaign = await campaignRepository.UpdateAsync(campaignFound);
            if (updatedCampaign is null)
            {
                return Result<string>.Failure(CampaignError.UpdateFailed);
            }
            return Result<string>.Success(tryAddCharacterResult.Message!);
        }

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

            var tryRemoveCharacterResult = campaignFound.TryRemoveCharacter(request.CharacterId);

            if (!tryRemoveCharacterResult.IsSuccess)
            {
                return Result<string>.Failure(tryRemoveCharacterResult.Error!);
            }

            //Character accepted into campaign

            var updatedCampaign = await campaignRepository.UpdateAsync(campaignFound);
            if (updatedCampaign is null)
            {
                return Result<string>.Failure(CampaignError.UpdateFailed);
            }
            return Result<string>.Success(tryRemoveCharacterResult.Message!);
        }
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

            CampaignTryActionResult tryAcceptCharacterResult;

            if (request.IsAccepted)
            {
                tryAcceptCharacterResult = campaignFound.TryAcceptCharacter(request.CharacterId);
            }
            else
            {
                tryAcceptCharacterResult = campaignFound.TryRejectCharacter(request.CharacterId);
            }

            if (!tryAcceptCharacterResult.IsSuccess)
            {
                return Result<string>.Failure(tryAcceptCharacterResult.Error!);
            }

            //Character accepted into campaign

            var updatedCampaign = await campaignRepository.UpdateAsync(campaignFound);
            if (updatedCampaign is null)
            {
                return Result<string>.Failure(CampaignError.UpdateFailed);
            }
            return Result<string>.Success(tryAcceptCharacterResult.Message!);
        }
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
            var tryRemovePlayerResult = campaignFound.TryRemovePlayer(request.PlayerId);
            if (!tryRemovePlayerResult.IsSuccess)
            {
                return Result<string>.Failure(tryRemovePlayerResult.Error!);
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

            return Result<string>.Success(tryRemovePlayerResult.Message!);
        }

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

            var tryRemovePlayerResult = campaignFound.TryRemovePlayer(userIdGuid);
            if (!tryRemovePlayerResult.IsSuccess)
            {
                return Result<string>.Failure(tryRemovePlayerResult.Error!);
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
            var checkCampaignChatMessageValidator = campaignChatMessageValidator.Validate(request);
            if (!checkCampaignChatMessageValidator.IsValid) return checkCampaignChatMessageValidator.ReturnErrors<string>();
            var campaign = await campaignRepository.GetByIdAsync(request.CampaignId);
            if (campaign is null) return Result<string>.Failure(CampaignError.NotFound);
            if (!Guid.TryParse(userId, out var guidUserId)) return Result<string>.Failure(Error.InvalidUserId);
            var isGameMaster = campaign.GameMasterId.Equals(guidUserId);
            if (!isGameMaster && !campaign.IsActive)
            {
                return Result<string>.Failure(CampaignError.IsNotActive);
            }
          
            var user = await userRepository.GetByIdAsync(guidUserId);
            if (user is null)
            {
                return Result<string>.Failure(AuthError.UserNotFound);
            }

            ChatMessage newMessage = new()
            {
                Id = Guid.NewGuid(),
                UserId = user.Id,
                Username = user.DisplayName,
                CampaignId = request.CampaignId,
                UserIcon = user.IconPath,
                Data = request.Message,
                SentAt = DateTime.UtcNow
            };

            await campaignChatRepository.InsertAsync(newMessage);

            await campaignChatService.SendMessage(request.CampaignId.ToString(), newMessage.Adapt<CampaignChatMessagesResponse>());

            return Result<string>.Success($"Message sent by {user.DisplayName} : {request.Message}");
        }
        public async Task<Result<ChatPagedResultDto>> GetChatMessages(string userId,DateTime? beforeSentAt ,int pageSize,Guid campaignId)
        {
            //needs more verification
            var campaign = await campaignRepository.GetByIdAsync(campaignId);
            if (campaign is null) return Result<ChatPagedResultDto>.Failure(CampaignError.NotFound);
            if (!Guid.TryParse(userId, out var guidUserId)) return Result<ChatPagedResultDto>.Failure(Error.InvalidUserId);
            var isPlayerInCampaign = campaign.PlayerIds.Contains(guidUserId)
                | campaign.GameMasterId.Equals(guidUserId);
            if(!isPlayerInCampaign)
            {
                return Result<ChatPagedResultDto>.Failure(CampaignError.NotAPlayer);
            }
            var isGameMaster = campaign.GameMasterId.Equals(guidUserId);
            if (!isGameMaster && !campaign.IsActive){
                return Result<ChatPagedResultDto>.Failure(CampaignError.IsNotActive);
                //var newcampaignChat = await campaignChatRepository.InsertAsync(new CampaignChat(campaignId));
                //if (newcampaignChat is null)
                //{
                //    return Result<IEnumerable<CampaignChatMessagesResponse>>.Failure(CampaignError.ChatNotFound);
                //}
                //var newMessages = campaignChat.ChatMessages.Adapt<IEnumerable<CampaignChatMessagesResponse>>();
                //return Result<IEnumerable<CampaignChatMessagesResponse>>.Success(newMessages);

            }

            //var campaignChat = await campaignChatRepository.GetCampaignChat(campaignId);
            var messages = (await campaignChatRepository.GetMessagesPagedAsync(campaignId, beforeSentAt,pageSize+1)).ToList();
            if (messages is null)
            {
                //var newcampaignChat = await campaignChatRepository.InsertAsync(new CampaignChat(campaignId));
                //if (newcampaignChat is null)
                //{
                //    return Result<IEnumerable<CampaignChatMessagesResponse>>.Failure("Failed to get campaign chat");
                //}
                //var newMessages = campaignChat.ChatMessages.Adapt<IEnumerable<CampaignChatMessagesResponse>>();
                //return Result<IEnumerable<CampaignChatMessagesResponse>>.Success(newMessages);
                return Result<ChatPagedResultDto>.Failure(CampaignError.ChatNotFound);
            }

            DateTime? nextCursor = messages.FirstOrDefault()?.SentAt;

            if (!beforeSentAt.HasValue)
            {
                var user = await userRepository.GetByIdAsync(guidUserId);
                if (user is not null)
                {
                    await PlayerJoinChatMessage(campaignId.ToString(), user.DisplayName);
                }
            }
            //var messages = campaignChat.ChatMessages.Adapt<IEnumerable<CampaignChatMessagesResponse>>();
            var responseMessages = messages.Adapt<IEnumerable<CampaignChatMessagesResponse>>();
            bool hasMore = messages.Count > pageSize;

            ChatPagedResultDto result = new(
                responseMessages,
                nextCursor,
                hasMore
            );
            return Result<ChatPagedResultDto>.Success(result);
        }
        public async Task PlayerJoinChatMessage(string campaignId, string UserName)
        {
            var message = new CampaignChatMessagesResponse(
                Guid.Empty,
                Guid.Empty,
                "RPG DEX",
                "",
                $"{UserName} has joined the campaign chat",
                DateTime.UtcNow
            );
            await campaignChatService.SendMessage(campaignId, message);
        }

    }
}
