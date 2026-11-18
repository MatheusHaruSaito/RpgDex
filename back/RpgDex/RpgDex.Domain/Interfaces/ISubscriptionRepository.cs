using RpgDex.Domain.Entities;
using RpgDex.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface ISubscriptionRepository
    {
        Task<bool> UserHasActiveSubscriptionOnPlan(Guid userId, Guid planId);
        Task<IEnumerable<Subscription>> GetAllActiveSubscriptionsByUserId(Guid userId);
        Task Insert(Subscription subscription);
        Task<Subscription> GetByUserId(Guid userId); 
        Task<bool> ExistsByPaymentId(Guid paymentId);
        Task<IEnumerable<Subscription>> GetExpiredAsync();
        Task SetIsActive(Subscription subscription, bool isActive);
        Task<List<Subscription>> GetLiveByUserAsync(Guid userId, DateTime nowUtc);
        Task<Subscription?> GetById(Guid id);
        Task<bool> TryUpdateAsync(Subscription before, DateTime newStart, DateTime newExpires, Guid paymentId, LedgerEntryKind kind);
        Task<IEnumerable<Subscription>> GetByLedgerPaymentIdAsync(Guid paymentId);
        Task<bool> TryRevertAsync(Subscription before, Guid paymentId, DateTime newStart, DateTime newExpires, bool deactivate);
    }
}
