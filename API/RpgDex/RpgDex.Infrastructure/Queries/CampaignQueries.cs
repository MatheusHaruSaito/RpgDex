using MongoDB.Driver;
using RpgDex.Application.Dto;
using RpgDex.Application.Dto.Campaign;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Entities;
using RpgDex.Infrastructure.Data;

namespace RpgDex.Infrastructure.Queries
{
    public class CampaignQueries : ICampaignQueries
    {
        private readonly IMongoCollection<Campaign> _entity;
        public CampaignQueries(MongoDbContext ctx)
        {
            _entity = ctx.Campaigns;
        }
        public async Task<CampaignChartResponse> GetCampaignChart(DateTime startDate, DateTime endDate)
        {
            var filter = Builders<Campaign>.Filter.And(
                   Builders<Campaign>.Filter.Gte(u => u.CreatedAt, startDate),
                   Builders<Campaign>.Filter.Lte(u => u.CreatedAt, endDate));

            var groupsTask = _entity.Aggregate()
                .Match(filter)
                .Group(u => new { u.CreatedAt.Year, u.CreatedAt.Month },
                       g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
                .ToListAsync();

            var totalTask = _entity.CountDocumentsAsync(FilterDefinition<Campaign>.Empty);

            await Task.WhenAll(groupsTask, totalTask);

            var points = groupsTask.Result
                .OrderBy(g => g.Year).ThenBy(g => g.Month)
                .Select(g => new ChartPoint(g.Year, g.Month, g.Count))
                .ToList();


            return new CampaignChartResponse(points, totalTask.Result, points.Sum(p => p.Count));
        }
    }
}
