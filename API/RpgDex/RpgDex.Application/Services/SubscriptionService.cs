using RpgDex.Application.Interfaces;
using RpgDex.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Services
{
    internal class SubscriptionService(ISubscriptionRepository subscriptionRepository) : ISubscriptionService
    {
        public async Task ExpireOverdueAsync()
        {
            var expired = await subscriptionRepository.GetExpiredAsync();
            foreach(var subscription in expired)
            {
                await subscriptionRepository.SetIsActive(subscription,false);
            }
        }
    }
}
