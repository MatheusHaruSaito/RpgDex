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
        public async Task<ChartResponse> GetCampaignChart(DateTime startDate, DateTime endDate)
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


            return new ChartResponse(points, totalTask.Result, points.Sum(p => p.Count));
        }
    }
}
