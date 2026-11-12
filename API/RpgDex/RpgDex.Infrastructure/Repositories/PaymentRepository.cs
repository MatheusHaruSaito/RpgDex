using MongoDB.Driver;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Enums;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Repositories
{
    public class PaymentRepository : IPaymentRepository
    {
        private readonly IMongoCollection<Payment> _entity;
        public PaymentRepository(MongoDbContext ctx)
        {
            _entity = ctx.Payments;
        }
        public async Task<Payment> GetById(Guid id) =>
            await _entity.Find(p => p.Id == id).FirstOrDefaultAsync();

        public async Task<Payment> GetByMpOrderId(string orderId) =>
            await _entity.Find(p => p.MpOrderId == orderId).FirstOrDefaultAsync();

        public async Task<IEnumerable<Payment>> GetPendingAsync(Guid id) =>
            await _entity.Find(p => p.Status == PaymentStatus.Pending).ToListAsync();

        public async Task<IEnumerable<Payment>> GetPendingAsync(DateTime olderThanUtc, int limit)
        {
            var f = Builders<Payment>.Filter;
            var filter = f.And(
                f.Eq(p => p.Status, PaymentStatus.Pending),
                f.Ne(p => p.MpOrderId, null),
                f.Ne(p => p.MpOrderId, string.Empty),
                f.Lte(p => p.Date, olderThanUtc));

            return await _entity.Find(filter)
                .SortByDescending(p => p.Date)
                .Limit(limit)
                .ToListAsync();
        }

        public async Task Insert(Payment payment) =>
            await _entity.InsertOneAsync(payment);

        public async Task<bool> UpdatePaymentStatus(Guid id, PaymentStatus status)
        {
            var filter = Builders<Payment>.Filter.Eq(p => p.Id, id);
            var update = Builders<Payment>.Update.Set(p => p.Status, status);
            var result = await _entity.UpdateOneAsync(filter,update);
            return result.MatchedCount > 0 &&  result.IsAcknowledged;
        }
    }
}
