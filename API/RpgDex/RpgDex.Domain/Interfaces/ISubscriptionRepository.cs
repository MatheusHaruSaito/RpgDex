using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface ISubscriptionRepository
    {
        Task Insert(Subscription subscription);
        Task<Subscription> GetByUserId(Guid userId); 
        Task<bool> ExistsByPaymentId(Guid paymentId);
        Task<IEnumerable<Subscription>> GetExpiredAsync();
        Task SetIsActive(Subscription subscription, bool isActive);

    }
}
