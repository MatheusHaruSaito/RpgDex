using MercadoPago.Resource.User;
using MongoDB.Driver;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Enums;
using RpgDex.Domain.Interfaces;
using RpgDex.Domain.ValueObjects;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Repositories
{
    public class SubscriptionRepository : ISubscriptionRepository
    {
        private readonly IMongoCollection<Subscription> _entity;
        public SubscriptionRepository(MongoDbContext ctx)
        {
            _entity = ctx.Subscriptions;
        }

        public async Task<bool> UserHasActiveSubscriptionOnPlan(Guid userId,Guid planId) =>
            await _entity.Find(s => s.UserId == userId && s.PlanId == planId && s.IsActive).FirstOrDefaultAsync() is not null;
        public async Task<IEnumerable<Subscription>> GetAllActiveSubscriptionsByUserId(Guid userId) =>
            await _entity.Find(s => s.UserId == userId && s.IsActive).ToListAsync();
        public async Task<bool> ExistsByPaymentId(Guid paymentId)
        {
            var f = Builders<Subscription>.Filter;
            return await _entity.Find(f.Or(
                f.Eq(s => s.PaymentId, paymentId),
                f.ElemMatch(s => s.Ledger, e => e.PaymentId == paymentId && e.Kind != LedgerEntryKind.Shifted)))
                .AnyAsync();
        }

        public async Task<Subscription> GetByUserId(Guid userId) =>
            await _entity.Find(s => s.UserId == userId).FirstOrDefaultAsync();

        public async Task<IEnumerable<Subscription>> GetExpiredAsync() =>
            await _entity.Find(s => s.ExpiresAt < DateTime.UtcNow).ToListAsync();


        public async Task Insert(Subscription subscription) =>
            await _entity.InsertOneAsync(subscription);

        public async Task SetIsActive(Subscription subscription, bool isActive) =>
            await _entity.UpdateOneAsync(s => s.Id == subscription.Id,
                Builders<Subscription>.Update.Set(s => s.IsActive,isActive));
        public async Task<bool> TryUpdateAsync(Subscription before, DateTime newStart, DateTime newExpires, Guid paymentId, LedgerEntryKind kind)
        {
            var f = Builders<Subscription>.Filter;
            var u = Builders<Subscription>.Update;

            var entry = new SubscriptionLedgerEntry
            {
                PaymentId = paymentId,
                Kind = kind,
                StartDeltaTicks = (newStart - before.StartDate).Ticks,
                ExpiresDeltaTicks = (newExpires - before.ExpiresAt).Ticks
            };

            var filter = f.And(
                f.Eq(s => s.Id, before.Id),
                f.Eq(s => s.ExpiresAt, before.ExpiresAt),
                f.Not(f.ElemMatch(s => s.Ledger, e => e.PaymentId == paymentId && e.Kind == kind)));

            var update = u.Set(s => s.StartDate, newStart)
                          .Set(s => s.ExpiresAt, newExpires)
                          .Push(s => s.Ledger, entry);

            return (await _entity.UpdateOneAsync(filter, update)).ModifiedCount == 1;
        }
        public async Task<List<Subscription>> GetLiveByUserAsync(Guid userId, DateTime nowUtc) =>
            await _entity
                .Find(s => s.UserId == userId && s.IsActive && s.ExpiresAt > nowUtc)
                .ToListAsync();

        public async Task<Subscription?> GetById(Guid id) =>
            await _entity
                .Find(s => s.Id == id)
                .FirstOrDefaultAsync();
        public async Task<IEnumerable<Subscription>> GetByLedgerPaymentIdAsync(Guid paymentId) =>
            await _entity
                .Find(s => s.Ledger.Any(l => l.PaymentId == paymentId))
                .ToListAsync();
        public async Task<bool> TryRevertAsync(Subscription before, Guid paymentId, DateTime newStart, DateTime newExpires, bool deactivate)
        {
            var f = Builders<Subscription>.Filter;
            var u = Builders<Subscription>.Update;

            var filter = f.And(
                f.Eq(s => s.Id, before.Id),
                f.Eq(s => s.ExpiresAt, before.ExpiresAt),
                f.ElemMatch(s => s.Ledger, e => e.PaymentId == paymentId));

            var update = u.Set(s => s.StartDate, newStart)
                          .Set(s => s.ExpiresAt, newExpires)
                          .PullFilter(s => s.Ledger, e => e.PaymentId == paymentId);

            if (deactivate) update = update.Set(s => s.IsActive, false);

            return (await _entity.UpdateOneAsync(filter, update)).ModifiedCount == 1;
        }
    }
}
