using MongoDB.Driver;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Repositories
{
    public class CampaignChatRepository : ICampaignChatRepository
    {
        private readonly MongoDbContext _dbContext;
        private readonly IMongoCollection<CampaignChat> _entity;

        public CampaignChatRepository(MongoDbContext dbContex)
        {
            _dbContext = dbContex;
            _entity = dbContex.CampaignChat;
        }

        public async Task<CampaignChat> InsertAsync(CampaignChat campaignChat)
        {
            await _entity.InsertOneAsync(campaignChat);
            return await _entity.Find(o => o.Id == campaignChat.Id).FirstOrDefaultAsync();
        }

        public async Task<CampaignChat> GetCampaignChat(Guid campaignId)
        {
            return await _entity.Find(o => o.CampaignId == campaignId).FirstOrDefaultAsync();
        }

        public async Task<bool> UpdateCampaignChatMessage(Guid id,IEnumerable<ChatMessage> campaignChat)
        {
            var filter = Builders<CampaignChat>.Filter.Eq(c => c.Id, id);
            var update = Builders<CampaignChat>.Update.Set("ChatMessages", campaignChat);
            var result =await _entity.UpdateOneAsync(filter, update);
            return result.ModifiedCount >0;
        }
    }
}
