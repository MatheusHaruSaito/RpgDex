using Mapster;
using RpgDex.Application.Dto.Subscription;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Common;
using RpgDex.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Services
{
    public class SubscriptionService(ISubscriptionRepository subscriptionRepository, ISubscriptionQueries subscriptionQueries) : ISubscriptionService
    {
        private static readonly PlanLimitsDTO FreeLimits = new(
            HasEarlyAccess: false,
            CharacterPerCampaignQty: 10,
            CampaignQty: 3,
            DocumentsSpaceMB: 10);
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
                var freeLimit = new PlanLimitsDTO(FreeLimits.HasEarlyAccess, FreeLimits.CharacterPerCampaignQty, FreeLimits.CampaignQty, FreeLimits.DocumentsSpaceMB);
                return Result<PlanLimitsDTO>.Success(freeLimit);
            }
            return Result<PlanLimitsDTO>.Success(result);


        }
    }
}
