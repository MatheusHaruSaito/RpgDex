using MongoDB.Driver;
using RpgDex.Domain.Interfaces;
using RpgDex.Domain.Entities;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Repositories
{
    public class CampaignRepository : ICampaignRepository
    {
        private readonly MongoDbContext _context;
        private readonly IMongoCollection<Campaign> _entity;
        public CampaignRepository(MongoDbContext context)
        {
            _context = context;
            _entity = context.Campaigns;
        }
        public async Task<Campaign> InsertAsync(Campaign campaign)
        {
            await _entity.InsertOneAsync(campaign);

            return await _entity.Find(o => o.Id == campaign.Id).FirstOrDefaultAsync();
        }

        public async Task<GetAllCampaignResult> GetAllAsync(Guid userId)
        {
            var filter = Builders<Campaign>.Filter.Eq(c => c.GameMasterId, userId);
            var result = await _entity.Find(filter).ToListAsync();
            return new GetAllCampaignResult(result,result.Count);

        }
        public async Task<Campaign> GetByIdAsync(Guid id)
        {
            return await _entity.Find(u => u.Id == id).FirstOrDefaultAsync();
        }
        public async Task<GetAllCampaignResult> GetAllAsync(Guid userId, int page = 1, int pageSize = 5)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize < 1 ? 1 : pageSize;
            var filter = GetCampaignFilter(userId);
            var total = _entity.CountDocumentsAsync(filter);
            var request= _entity.Find(filter)
                .Skip((page - 1) * pageSize)
                .Limit(pageSize)
                .ToListAsync();
            await Task.WhenAll(total, request);
            return new GetAllCampaignResult(request.Result, (int)total.Result);

        }
        public async Task<long> GetUserCampaignCount(Guid userId)
        {

            var filter = GetCampaignFilter(userId);
            return await _entity.Find(filter).CountDocumentsAsync();
        }
        public async Task<Campaign> UpdateAsync(Campaign newCampaign)
        {
            var filter = Builders<Campaign>.Filter.Eq(c => c.Id, newCampaign.Id);

            var options = new FindOneAndReplaceOptions<Campaign>
            {
                ReturnDocument = ReturnDocument.After
            };

            var result = await _entity.FindOneAndReplaceAsync(filter, newCampaign, options);
            return result;
        }

        public async Task<bool> SetActiveState(Guid Id, bool ActiveState)
        {
            var filter = Builders<Campaign>.Filter.Eq(c => c.Id, Id);
            var updatedCampaign = Builders<Campaign>.Update
                .Set(c => c.IsActive, ActiveState);

            var result = await _entity.UpdateOneAsync(filter, updatedCampaign);
            return result.MatchedCount > 0;
        }

        private FilterDefinition<Campaign> GetCampaignFilter(Guid userId)
        {
            return (Builders<Campaign>.Filter.Eq(c => c.GameMasterId, userId))
                        | Builders<Campaign>.Filter.AnyEq("PlayerIds", userId)
                        & Builders<Campaign>.Filter.Eq(c=> c.IsActive, true);

        }
    }
}
