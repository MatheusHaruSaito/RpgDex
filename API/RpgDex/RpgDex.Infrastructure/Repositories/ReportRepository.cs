using MongoDB.Driver;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Repositories
{
    public class ReportRepository : IReportRepository
    {
        private readonly MongoDbContext _mongoDbContext;
        private readonly IMongoCollection<Report> _entitie;
        public ReportRepository(MongoDbContext mongoDbContext)
        {
            _mongoDbContext = mongoDbContext;
            _entitie = _mongoDbContext.Reports;
        }

        public async Task<IEnumerable<Report>> GetAllAsync(int page = 1, int pageSize = 5)
        {
            page = page< 1 ? 1 : page;
            pageSize = pageSize < 1 ? 1 : pageSize;
            var request = await _entitie.Find(r => true)
                .Skip((page -1) * pageSize)
                .Limit(pageSize)
                .ToListAsync();
            return request;
        }

        public async Task<Report> GetByIdAsync(Guid id)
        {
            var filter = Builders<Report>.Filter.Eq(r => r.Id, id);
            return await _entitie.Find(filter).FirstOrDefaultAsync();
        }

        public async Task<long> GetReportsCountAsync()
        {
            var filter = Builders<Report>.Filter.Eq(c => c.IsActive, true);
            return await _entitie.Find(filter).CountDocumentsAsync();
        }

        public async Task<Report> InsertAsync(Report report)
        {
            await _entitie.InsertOneAsync(report);
            return report;
        }

        public async Task<bool> SetActiveState(Guid Id, bool ActiveState)
        {
            var filter = Builders<Report>.Filter.Eq(r => r.Id, Id);
            var update = Builders<Report>.Update.Set(r => r.IsActive,ActiveState);
            var result = await _entitie.UpdateOneAsync(filter, update);
            return result.ModifiedCount > 0;
        }
    }
}
