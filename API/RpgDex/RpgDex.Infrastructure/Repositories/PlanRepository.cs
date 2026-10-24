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
    public class PlanRepository : IPlanRepository
    {
        private readonly IMongoCollection<Plan> _entity;
        public PlanRepository(MongoDbContext ctx)
        {
            _entity = ctx.Plans;
        }
        public async Task<Plan> GetById(Guid id) =>
            await _entity.Find(p => p.Id == id).FirstOrDefaultAsync();
        public async Task<IEnumerable<Plan>> GetAll() =>
        await _entity.Find(p => p.IsActive).ToListAsync();

        public async Task Insert(Plan payment) =>
            await _entity.InsertOneAsync(payment);


    }
}
