using MongoDB.Driver;
using RpgDex.Application.Dto;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Entities;
using RpgDex.Infrastructure.Data;
using RpgDex.Domain.Interfaces;
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
        public async Task<ChartResponse> GetCharacterChart(DateTime startDate, DateTime endDate)
        {
            var filter = Builders<Character>.Filter.And(
                   Builders<Character>.Filter.Gte(u => u.CreatedAt, startDate),
                   Builders<Character>.Filter.Lte(u => u.CreatedAt, endDate));

            var groupsTask = _entity.Aggregate()
                .Match(filter)
                .Group(u => new { u.CreatedAt.Year, u.CreatedAt.Month },
                       g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
                .ToListAsync();

            var totalTask = _entity.CountDocumentsAsync(FilterDefinition<Character>.Empty);

            await Task.WhenAll(groupsTask, totalTask);

            var points = groupsTask.Result
                .OrderBy(g => g.Year).ThenBy(g => g.Month)
                .Select(g => new ChartPoint(g.Year, g.Month, g.Count))
                .ToList();


            return new ChartResponse(points, totalTask.Result, points.Sum(p => p.Count));
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
