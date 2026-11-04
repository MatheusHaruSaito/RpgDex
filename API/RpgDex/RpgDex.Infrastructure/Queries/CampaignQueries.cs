using ImageMagick;
using MongoDB.Driver;
using RpgDex.Application.Dto;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Queries
{
    public class CampaignQueries : ICampaignQueries
    {
        private readonly IMongoCollection<Campaign> _entity;
        public CampaignQueries(MongoDbContext ctx)
        {
            _entity = ctx.Campaigns;
        }
        public async Task<(IEnumerable<Campaign> Campaigns, int Total)> GetAllAsync(Guid userId, int page = 1, int pageSize = 5)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize < 1 ? 1 : pageSize;
            var filter = Builders<Campaign>.Filter.Eq(c => c.GameMasterId, userId)
                | (Builders<Campaign>.Filter.AnyEq("PlayerIds", userId)
                & Builders<Campaign>.Filter.Eq(c => c.IsActive, true));

            var total = _entity.CountDocumentsAsync(filter);
            var request = _entity.Find(filter)
                .Skip((page - 1) * pageSize)
                .Limit(pageSize)
                .ToListAsync();
            await Task.WhenAll(total, request);

            return (request.Result,(int)total.Result);

        }
    }
}
