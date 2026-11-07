using Mapster;
using Microsoft.Extensions.Logging;
using RpgDex.Application.Dto.Subscription;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Common;
using RpgDex.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Services
{
    public class SubscriptionService(ISubscriptionRepository subscriptionRepository, ISubscriptionQueries subscriptionQueries, ILogger<SubscriptionService> logger) : ISubscriptionService
    {
        private static readonly PlanLimitsDTO FreeLimits = new(
            HasEarlyAccess: false,
            CharacterQty: 10,
            CampaignQty: 3,
            DocumentsSpaceMB: 10,
            CanvasSpaceMb: 15);
        public async Task ExpireOverdueAsync()
        {
            var expired = await subscriptionRepository.GetExpiredAsync();
            foreach(var subscription in expired)
            {
                await subscriptionRepository.SetIsActive(subscription,false);
            }
        }

        public async Task<Result<PlanLimitsDTO>> GetSubscritptionLimits(string userId)
        {
            if (!Guid.TryParse(userId, out var userGuidId)) return Result<PlanLimitsDTO>.Failure(Error.InvalidUserId);
            var result = await subscriptionQueries.GetPlanLimitsByUserId(userGuidId);

            if(result is null)
            {
                var freeLimit = new PlanLimitsDTO(FreeLimits.HasEarlyAccess, FreeLimits.CharacterQty, FreeLimits.CampaignQty, FreeLimits.DocumentsSpaceMB, FreeLimits.CanvasSpaceMb);
                return Result<PlanLimitsDTO>.Success(freeLimit);
            }
            return Result<PlanLimitsDTO>.Success(result);


        }

        public async Task<bool> HasEarlyAccess(string userId)
        {
            if (!Guid.TryParse(userId, out var userGuidId)) return false;
            var result = await subscriptionQueries.GetPlanLimitsByUserId(userGuidId);

            if (result is null)
            {           
                return FreeLimits.HasEarlyAccess;
            }
            return result.HasEarlyAccess;
        }
        public async Task<IEnumerable<UserSubscriptionInfo>?> GetAllUserPlanInfo(string userId)
        {
            if (!Guid.TryParse(userId, out var userGuidId)) return null;
            var result = await subscriptionQueries.GetUserCurrentSubscriptions(userGuidId);

            if (result is null || result.Count() == 0)
            {
                return new List<UserSubscriptionInfo> { new UserSubscriptionInfo(Guid.Empty, "Free Plan", DateTime.MaxValue) };
            }
            return result;
        }

        public Result<PlanLimitsDTO> GetFreePlanLimits()
        {
            return Result<PlanLimitsDTO>.Success(FreeLimits);
        }
    }
}
