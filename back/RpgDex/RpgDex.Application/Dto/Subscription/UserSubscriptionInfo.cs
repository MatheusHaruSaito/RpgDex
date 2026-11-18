using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Subscription
{
    public record UserSubscriptionInfo(Guid PlanId, string PlanName, DateTime ExpirationDate);
}
