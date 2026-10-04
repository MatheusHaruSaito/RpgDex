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
        private readonly IMongoCollection<ChatMessage> _entity;

        public CampaignChatRepository(MongoDbContext dbContex)
        {
            _dbContext = dbContex;
            _entity = dbContex.ChatMessage;
        }

        public async Task<ChatMessage> InsertAsync(ChatMessage campaignChat)
        {
            await _entity.InsertOneAsync(campaignChat);
            return campaignChat;
        }

        public async Task<ChatMessage> GetCampaignChat(Guid campaignId)
        {
            return await _entity.Find(o => o.CampaignId == campaignId).FirstOrDefaultAsync();
        }

        public async Task<IEnumerable<ChatMessage>> GetMessagesPagedAsync(Guid campaignId, DateTime? beforeSentAt, int pageSize = 20)
        {
            var builder = Builders<ChatMessage>.Filter;
            var filter = builder.Eq(m => m.CampaignId, campaignId);

            // Se passar uma data, busca apenas as mensagens mais antigas que ela (scroll para cima)
            if (beforeSentAt.HasValue)
            {
                filter &= builder.Lt(m => m.SentAt, beforeSentAt.Value);
            }

            var messages = await _entity.Find(filter)
                                 .Sort(Builders<ChatMessage>.Sort
                                     .Descending(m => m.SentAt)
                                     .Descending(m => m.Id))
                                 .Limit(pageSize)
                                 .ToListAsync();
            messages.Reverse();
            return messages;
        }

    }
}
