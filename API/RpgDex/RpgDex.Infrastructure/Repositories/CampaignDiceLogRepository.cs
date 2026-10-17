using MongoDB.Driver;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Repositories
{
    public class CampaignDiceLogRepository : ICampaignDiceLogRepository
    {
        private const int MAX_ROLLS = 15;
        private readonly IMongoCollection<CampaignDiceLog> _entity;
        public CampaignDiceLogRepository(MongoDbContext ctx)
        {
            _entity = ctx.CampaignDiceLogs;
        }
        public async Task<bool> AddRollAsync(Guid campaignId, DiceRoll roll)
        {
            var filter = Builders<CampaignDiceLog>.Filter.Eq(l => l.CampaignId, campaignId);

            var update = Builders<CampaignDiceLog>.Update
                .PushEach(l => l.Rolls, new[] { roll }, slice: -MAX_ROLLS);
            var result = await _entity.UpdateOneAsync(filter, update, new UpdateOptions { IsUpsert = true });
            return result.ModifiedCount > 0;
        }

        public async Task<CampaignDiceLog> GetCampaignDiceLog(Guid campaignId)
        {
            return await _entity.Find(c => c.CampaignId == campaignId).FirstOrDefaultAsync();
        }
    }
}
