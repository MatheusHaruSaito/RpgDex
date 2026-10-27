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
        public async Task<GetAllCharactersResult> GetPlayerCharactersFromCampaign(Guid userId, Guid campaignId)
        {
            var campaign =await  _campaignEntity.Find(x => x.Id == campaignId).FirstOrDefaultAsync();
            var chracterIds = campaign.CharacterIds;
            var characters =  await _entity.Find(x => chracterIds.Contains(x.Id)).ToListAsync();
            var playerCharacetrs = characters.Where(x=> x.UserId == userId);
            return new(playerCharacetrs, playerCharacetrs.Count());
        }
    }
}
