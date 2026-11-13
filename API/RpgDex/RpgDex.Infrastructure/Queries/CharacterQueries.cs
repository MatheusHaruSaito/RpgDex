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
