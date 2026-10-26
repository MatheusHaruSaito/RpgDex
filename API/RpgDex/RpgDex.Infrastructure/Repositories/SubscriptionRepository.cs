using MercadoPago.Resource.User;
using MongoDB.Driver;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
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

        public async Task<bool> ExistsByPaymentId(Guid paymentId) =>
            await _entity.Find(s => s.PaymentId == paymentId).FirstOrDefaultAsync() is not null;

        public async Task<Subscription> GetByUserId(Guid userId) =>
            await _entity.Find(s => s.UserId == userId).FirstOrDefaultAsync();

        public async Task<IEnumerable<Subscription>> GetExpiredAsync() =>
            await _entity.Find(s => s.ExpiresAt < DateTime.UtcNow).ToListAsync();


        public async Task Insert(Subscription subscription) =>
            await _entity.InsertOneAsync(subscription);

        public async Task SetIsActive(Subscription subscription, bool isActive) =>
            await _entity.UpdateOneAsync(s => s.Id == subscription.Id,
                Builders<Subscription>.Update.Set(s => s.isActive,isActive));
    }
}
