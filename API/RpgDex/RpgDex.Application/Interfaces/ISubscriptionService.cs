using RpgDex.Application.Dto.Subscription;
using RpgDex.Domain.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface ISubscriptionService
    {
        Task ExpireOverdueAsync();
        Task<Result<PlanLimitsDTO>> GetSubscritptionLimits(string userId);
    }
}
