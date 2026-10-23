using MongoDB.Driver;
using RpgDex.Application.Dto;
using RpgDex.Application.Dto.Character;
using RpgDex.Application.Dto.User;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Entities;
using RpgDex.Infrastructure.Data;

namespace RpgDex.Infrastructure.Queries
{
    public class CharacterQueries : ICharacterQueries
    {
        private readonly IMongoCollection<Character> _entity;
        public CharacterQueries(MongoDbContext ctx)
        {
            _entity = ctx.Character;
        }
        public async Task<CharacterChartResponse> GetCharacterChart(DateTime startDate, DateTime endDate)
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


            return new CharacterChartResponse(points, totalTask.Result, points.Sum(p => p.Count));
        }
    }
}
