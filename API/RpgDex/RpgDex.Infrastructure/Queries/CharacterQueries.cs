using MongoDB.Driver;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Queries
{
    public class CharacterQueries : ICharacterQueries
    {
        private readonly IMongoCollection<Character> _entity;
        private readonly IMongoCollection<Campaign> _campaignEntity;

        public CharacterQueries(MongoDbContext ctx)
        {
            _entity = ctx.Character;
            _campaignEntity = ctx.Campaigns;
        }
        public async Task<(IEnumerable<Character> Characters, int Total)> GetPlayerCharactersFromCampaign(Guid userId, Guid campaignId)
        {
            var campaign =await  _campaignEntity.Find(x => x.Id == campaignId).FirstOrDefaultAsync();
            var chracterIds = campaign.CharacterIds;
            var characters =  await _entity.Find(x => chracterIds.Contains(x.Id)).ToListAsync();
            var playerCharacetrs = characters.Where(x=> x.UserId == userId);
            return new(playerCharacetrs, playerCharacetrs.Count());
        }
        public async Task<(IEnumerable<Character> Characters, int Total)> GetAllByUserIdAsync(Guid userId, int page = 1, int pageSize = 3)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize < 1 ? 1 : pageSize;
            var filter = Builders<Character>.Filter.Eq(c => c.UserId, userId)
                & Builders<Character>.Filter.Eq(c => c.IsActive, true);
            var reqeust = _entity.Find(filter)
                .Skip((page - 1) * pageSize)
                .Limit(pageSize)
                .ToListAsync();
            var total = _entity.CountDocumentsAsync(filter);
            await Task.WhenAll(reqeust, total);
            return (reqeust.Result, (int)total.Result);

        }
        public async Task<(IEnumerable<Character> Characters, int Total)> GetAllByUserIdAsync(Guid userId)
        {
            var filter = Builders<Character>.Filter.Eq(c => c.UserId, userId)
                & Builders<Character>.Filter.Eq(c => c.IsActive, true);
            var result = await _entity.Find(filter)
                .ToListAsync();
            return (result, result.Count());
        }
    }
}
