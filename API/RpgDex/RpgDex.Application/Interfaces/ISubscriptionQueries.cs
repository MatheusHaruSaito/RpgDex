using RpgDex.Application.Dto.Subscription;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface ISubscriptionQueries
    {
        Task<PlanLimitsDTO?> GetPlanLimits(Guid id);
    }
}
