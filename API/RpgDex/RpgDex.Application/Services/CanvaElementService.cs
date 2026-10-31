using FluentValidation;
using Mapster;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc.RazorPages;
using Microsoft.Extensions.Logging;
using MongoDB.Bson;
using RpgDex.Application.Dto;
using RpgDex.Application.Dto.Canvas;
using RpgDex.Application.Extension;
using RpgDex.Application.Interfaces;
using RpgDex.Application.Validators.Canvas;
using RpgDex.Domain.Common;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Domain.ValueObjects;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Services
{
    public class CanvaElementService(ICanvasElementRepository canvasElementRepository, UserManager<ApplicationUser> userManager, ICampaignRepository campaignRepository, IFileService fileService, ICharacterRepository characterRepository,
        ICanvasElementQueries canvasElementQueries,CreateCanvaElementRequestValidator createCanvaElementValidator, MoveCanvaElementsRequestValidator moveCanvaElementValidator, ReOrderCanvaElementsRequestValidator reOrderCanvaElementValidator,
        SetElementActiveStateRequestValidator setElementActiveStateValidator, UpdateCanvasElementRequestValidator updateCanvasElementValidator, ILogger<CanvaElementService> logger, ICharacterService characterSevice, ICampaignService campaignService,
        ISubscriptionService subscriptionService) : ICanvaElementService
    {
        public async Task<Result<CanvasElementResponse>> CreateElement(string userId, CreateCanvaElementRequest request)
        {
            var check = createCanvaElementValidator.Validate(request);
            if(!check.IsValid) return check.ReturnErrors<CanvasElementResponse>();

            var (guidUserId, gmId, accessError) = await CheckAccessAsync(userId, request.CampaignId);
            if (accessError is not null) return Result<CanvasElementResponse>.Failure(accessError);

            var imageSize = request.Image is null ? 0m : request.Image.Length;
            var element = request.Adapt<CanvasElement>();

            decimal elementSize = element.ToBson().Length;
            if (await CheckCanvasStorageAsync(gmId.ToString(), request.CampaignId, imageSize+elementSize)) return Result<CanvasElementResponse>.Failure(CanvaElementError.LimitReached);

            if (request.Image is not null)
            {
                try
                {
                    element.ImageUrl = await fileService.UploadFileAsync(request.Image, Guid.NewGuid().ToString());
                    elementSize += imageSize;

                }
                catch
                {
                    return Result<CanvasElementResponse>.Failure(Error.UploadImageFailed);
                }
            }
            element.ElementSize = elementSize / 1024m / 1024m;
            element.UserId = guidUserId;

            var created = await canvasElementRepository.InsertElementAsync(element);
            if (created is null)
                return Result<CanvasElementResponse>.Failure(CanvaElementError.CreateFailed);

            return Result<CanvasElementResponse>.Success(created.Adapt<CanvasElementResponse>());

        }

        public async Task<Result<CanvasElementResponse>> CreateTokenElement(string userId, CreateCanvaTokenElementRequest request, decimal imageSize = 0,bool checkLimit = false)
        {
            var (guidUserId, gmId, accessError) = await CheckAccessAsync(userId, request.CampaignId);
            if (accessError is not null) return Result<CanvasElementResponse>.Failure(accessError);
            var element = request.Adapt<CanvasElement>();
            decimal elementSize = element.ToBson().Length;
            elementSize += imageSize;

            if (await CheckCanvasStorageAsync(gmId.ToString(), request.CampaignId, elementSize) & checkLimit) return Result<CanvasElementResponse>.Failure(CanvaElementError.LimitReached);

            var character = await characterRepository.GetByIdAsync(request.CharacterId);
            if (character is null)
            {
                return Result<CanvasElementResponse>.Failure(CharacterError.NotFound);
            }
            else
            {
                if (character.IconPath is not null)
                    element.ImageUrl = character.IconPath;
            }

            element.UserId = guidUserId;
            element.ElementSize = elementSize / 1024m / 1024m;
            var created = await canvasElementRepository.InsertElementAsync(element);
            if (created is null)
                return Result<CanvasElementResponse>.Failure(CanvaElementError.CreateFailed);

            return Result<CanvasElementResponse>.Success(created.Adapt<CanvasElementResponse>());
        }
        public async Task<Result<CanvasElementResponse>> QuickCreateTokenElement(string userId, QuickCreateCanvaTokenElementRequest request)
        {
            var (userGuidId, gmId, accessError) = await CheckAccessAsync(userId, request.CampaignId);
            if (accessError is not null) return Result<CanvasElementResponse>.Failure(accessError);
            if (await CheckCanvasStorageAsync(gmId.ToString(), request.CampaignId, request.Adapt<CanvasElement>().ToBson().Length)) return Result<CanvasElementResponse>.Failure(CanvaElementError.LimitReached);

            //CreateCharacter
            Character character = new()
            {
                Name = request.Content,
            };
            var createCharacterResult =await characterSevice.Create(userId,new CreateCharacterRequest(character.Name, null,request.CharacterIcon,null));
            if (createCharacterResult.IsFailure)
            {
                return Result<CanvasElementResponse>.Failure(createCharacterResult.Errors);
            }
            //Add To Campaign
            //Add To Npc List, this is just for testing
            //change this when implement npcs
            var characterId = createCharacterResult.Value!.Id;
            var addCharacterResult =await campaignService.AddCharacter(userId, new(request.CampaignId, characterId));
            if (addCharacterResult.IsFailure)
            {
                return Result<CanvasElementResponse>.Failure(addCharacterResult.Errors);
            }
            var accpetCharacterResult = await campaignService.AcceptCharacter(userId, new(request.CampaignId, characterId, true));
            if (accpetCharacterResult.IsFailure)
            {
                return Result<CanvasElementResponse>.Failure(accpetCharacterResult.Errors);
            }
            //CreateToken
            var imageSize = 0m;
            if (request.CharacterIcon is not null)
            imageSize = request.CharacterIcon.Length;
            var requestAdapted =request.Adapt<CreateCanvaTokenElementRequest>() with { CharacterId = characterId};
            return await CreateTokenElement(userId, requestAdapted, imageSize,true);
        }

        public async Task<Result<GetAllCanvasElementResponse>> GetAllElements(string userId,Guid campaignId,int page =1 , int pageSize=20)
        {
            var (_, gmId, accessError) = await CheckAccessAsync(userId, campaignId);
            if (accessError is not null) return Result<GetAllCanvasElementResponse>.Failure(accessError);

            var limits = await subscriptionService.GetSubscritptionLimits(gmId.ToString());

            var result = await canvasElementQueries.GetAllCanvasElementByCampaignIdAsync(campaignId,page,pageSize);
            return Result<GetAllCanvasElementResponse>.Success(
                new GetAllCanvasElementResponse(result.Elements.Adapt<IEnumerable<CanvasElementResponse>>(), result.CanvasSizeMb, limits.Value!.CanvasSpaceMb));
        }

        public async Task<Result<bool>> MoveElement(string userId, MoveCanvaElementsRequest request)
        {
            var check = moveCanvaElementValidator.Validate(request);
            if (!check.IsValid) return check.ReturnErrors<bool>();
            var (_, _, accessError) = await CheckAccessAsync(userId, request.CampaignId);
            if (accessError is not null) return Result<bool>.Failure(accessError);

            var positions = request.Items.Select(i => new ElementPosition(i.Id, i.X, i.Y));
            var ok = await canvasElementRepository.MoveElementAsync(request.CampaignId, positions);

            return ok ? Result<bool>.Success(true) : Result<bool>.Failure(CanvaElementError.MoveFailed);
        }

        public async Task<Result<bool>> ReOrderElement(string userId,ReOrderCanvaElementsRequest request)
        {
            var check = reOrderCanvaElementValidator.Validate(request);
            if (!check.IsValid) return check.ReturnErrors<bool>();

            var (_, _, accessError) = await CheckAccessAsync(userId, request.CampaignId);
            if (accessError is not null) return Result<bool>.Failure(accessError);

            var orders = request.Items.Select(i => new ElementOrder(i.Id, i.Z));
            var ok = await canvasElementRepository.ReorderElementsAsync(request.CampaignId, orders);

            return ok ? Result<bool>.Success(true) : Result<bool>.Failure(CanvaElementError.ReorderFailed);
        }

        public async Task<Result<bool>> SetElementActiveState(string userId, SetElementActiveStateRequest request, bool state)
        {
            var check = setElementActiveStateValidator.Validate(request);
            if (!check.IsValid) return check.ReturnErrors<bool>();
            var (_, _, accessError) = await CheckAccessAsync(userId, request.CampaignId);
            if (accessError is not null) return Result<bool>.Failure(accessError);

            var ok = await canvasElementRepository.SetActiveState(request.Ids, request.CampaignId,state);

            return ok ? Result<bool>.Success(true) : Result<bool>.Failure(CanvaElementError.SetActiveStateFailed);
        }

        public async Task<Result<CanvasElementResponse>> UpdateElement(string userId,UpdateCanvasElementRequest request)
        {
            var check = updateCanvasElementValidator.Validate(request);
            if (!check.IsValid) return check.ReturnErrors<CanvasElementResponse>();

            var (_, gmId, accessError) = await CheckAccessAsync(userId, request.CampaignId);
            if (accessError is not null) return Result<CanvasElementResponse>.Failure(accessError);
            if (await CheckCanvasStorageAsync(gmId.ToString(), request.CampaignId)) return Result<CanvasElementResponse>.Failure(CanvaElementError.LimitReached);


            var element = await canvasElementRepository.GetByIdAsync(request.CampaignId, request.Id);
            if (element is null) return Result<CanvasElementResponse>.Failure(CanvaElementError.NotFound);

            if (request.Image is not null)
            {
                try
                {
                    element.ImageUrl = await fileService.UploadFileAsync(request.Image,Guid.NewGuid().ToString());
                }
                catch
                {
                    return Result<CanvasElementResponse>.Failure(Error.UploadImageFailed);
                }
            }

            element.Scale = request.Scale;
            element.Content = request.Content;
            element.Color = request.Color;
            element.Points = request.Points;
            element.StrokeWidth = request.StrokeWidth;

            var ok = await canvasElementRepository.UpdateElementAsync(element);
            if (!ok) return Result<CanvasElementResponse>.Failure(CanvaElementError.UpdateFailed);

            return Result<CanvasElementResponse>.Success(element.Adapt<CanvasElementResponse>());

        }
        private async Task<bool> CheckCanvasStorageAsync(string userId, Guid campaignId, decimal? imageLenghtOffset=0)
        {
            var campaignStorageSize = await canvasElementRepository.GetCanvasSizeByCampaignIdAsync(campaignId);
            var limits = await subscriptionService.GetSubscritptionLimits(userId);
            var imageInMb = imageLenghtOffset / 1024m / 1024m;

            if ((campaignStorageSize + imageInMb) <= limits.Value!.CanvasSpaceMb)
            {
                return false;
            }
            return true;
        }
        private async Task<(Guid UserId,Guid GmId, Error? Error)> CheckAccessAsync(string userId, Guid campaignId, bool gameMasterOnly = false)
        {
            if (!Guid.TryParse(userId, out var guidUserId))
                return (Guid.Empty, Guid.Empty, Error.InvalidUserId);

            var user = await userManager.FindByIdAsync(userId);
            if (user is null) return (guidUserId, Guid.Empty, AuthError.UserNotFound);

            var campaign = await campaignRepository.GetByIdAsync(campaignId);
            if (campaign is null) return (guidUserId, Guid.Empty, CampaignError.NotFound);
            if (!campaign.IsActive) return (guidUserId, Guid.Empty, CampaignError.IsNotActive);

            var isGm = campaign.GameMasterId == guidUserId;
            if (gameMasterOnly && !isGm) return (guidUserId, Guid.Empty, CampaignError.NotGameMaster);
            if (!isGm && !campaign.PlayerIds.Contains(guidUserId))
                return (guidUserId, campaign.GameMasterId, CampaignError.PlayerNotInCampaign);

            return (guidUserId, campaign.GameMasterId, null);
        }
    }
}
