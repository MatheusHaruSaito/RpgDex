using Mapster;
using Microsoft.AspNetCore.Identity;
using RpgDex.Application.Dto;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Common;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Domain.ValueObjects;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Services
{
    public class CanvaElementService(ICanvaElementRepository canvaElementRepository,UserManager<ApplicationUser> userManager, ICampaignRepository campaignRepository) : ICanvaElementService
    {
        private const int MaxElementsPerCanvas = 500;
        public async Task<Result<CanvasElementResponse>> CreateElement(string userId, CreateCampaignElementRequest request)
        {
            var(guidUserId, accessError) = await CheckAccessAsync(userId, request.CampaignId);
            if (accessError is not null) return Result<CanvasElementResponse>.Failure(accessError);

            var count = await canvaElementRepository.CountByCampaignAsync(request.CampaignId);
            if (count >= MaxElementsPerCanvas)
                return Result<CanvasElementResponse>.Failure(CanvaElementError.LimitReached);

            var element = request.Adapt<CanvaElement>();
            if (element.Id == Guid.Empty) element.Id = Guid.NewGuid();
            element.UserId = guidUserId;

            var created = await canvaElementRepository.InsertAsync(element);
            if (created is null)
                return Result<CanvasElementResponse>.Failure(CanvaElementError.CreateFailed);

            return Result<CanvasElementResponse>.Success(created.Adapt<CanvasElementResponse>());

        }

        public async Task<Result<GetAllCanvasElementResponse>> GetAllElements(string userId,Guid campaignId)
        {
            var (_, accessError) = await CheckAccessAsync(userId, campaignId);
            if (accessError is not null) return Result<GetAllCanvasElementResponse>.Failure(accessError);

            var result = await canvaElementRepository.GetAllElementsByCampaignAsync(campaignId);
            return Result<GetAllCanvasElementResponse>.Success(
                new GetAllCanvasElementResponse(result.elements.Adapt<IEnumerable<CanvasElementResponse>>(), result.Count));
        }

        public async Task<Result<bool>> MoveElement(string userId, MoveElementsRequest request)
        {
            var (_, accessError) = await CheckAccessAsync(userId, request.CampaignId);
            if (accessError is not null) return Result<bool>.Failure(accessError);

            var positions = request.Items.Select(i => new ElementPosition(i.Id, i.X, i.Y));
            var ok = await canvaElementRepository.MoveElementAsync(request.CampaignId, positions);

            return ok ? Result<bool>.Success(true) : Result<bool>.Failure(CanvaElementError.MoveFailed);
        }

        public async Task<Result<bool>> ReOrderElement(string userId,ReorderElementsRequest request)
        {
            var (_, accessError) = await CheckAccessAsync(userId, request.CampaignId);
            if (accessError is not null) return Result<bool>.Failure(accessError);

            var orders = request.Items.Select(i => new ElementOrder(i.Id, i.Z));
            var ok = await canvaElementRepository.ReorderElementsAsync(request.CampaignId, orders);

            return ok ? Result<bool>.Success(true) : Result<bool>.Failure(CanvaElementError.ReorderFailed);
        }

        public async Task<Result<bool>> SetElementActiveState(string userId, SetElementActiveStateRequest request, bool state)
        {
            var (_, accessError) = await CheckAccessAsync(userId, request.CampaignId);
            if (accessError is not null) return Result<bool>.Failure(accessError);

            var ok = await canvaElementRepository.SetActiveState(request.CampaignId, request.Id,state);

            return ok ? Result<bool>.Success(true) : Result<bool>.Failure(CanvaElementError.SetActiveStateFailed);
        }

        public async Task<Result<CanvasElementResponse>> UpdateElement(string userId,UpdateElementRequest request)
        {
            var (_, accessError) = await CheckAccessAsync(userId, request.CampaignId);
            if (accessError is not null) return Result<CanvasElementResponse>.Failure(accessError);

            var element = await canvaElementRepository.GetByIdAsync(request.CampaignId, request.Id);
            if (element is null) return Result<CanvasElementResponse>.Failure(CanvaElementError.NotFound);

            element.Scale = request.Scale;
            element.Content = request.Content;
            element.Color = request.Color;
            element.ImageUrl = request.ImageUrl;
            element.Points = request.Points;
            element.StrokeWidth = request.StrokeWidth;

            var ok = await canvaElementRepository.UpdateElementAsync(element);
            if (!ok) return Result<CanvasElementResponse>.Failure(CanvaElementError.UpdateFailed);

            return Result<CanvasElementResponse>.Success(element.Adapt<CanvasElementResponse>());

        }
        private async Task<(Guid UserId, Error? Error)> CheckAccessAsync(string userId, Guid campaignId, bool gameMasterOnly = false)
        {
            if (!Guid.TryParse(userId, out var guidUserId))
                return (Guid.Empty, Error.InvalidUserId);

            var user = await userManager.FindByIdAsync(userId);
            if (user is null) return (guidUserId, AuthError.UserNotFound);

            var campaign = await campaignRepository.GetByIdAsync(campaignId);
            if (campaign is null) return (guidUserId, CampaignError.NotFound);
            if (!campaign.IsActive) return (guidUserId, CampaignError.IsNotActive);

            var isGm = campaign.GameMasterId == guidUserId;
            if (gameMasterOnly && !isGm) return (guidUserId, CampaignError.NotGameMaster);
            if (!isGm && !campaign.PlayerIds.Contains(guidUserId))
                return (guidUserId, CampaignError.PlayerNotInCampaign);

            return (guidUserId, null);
        }
    }
}
