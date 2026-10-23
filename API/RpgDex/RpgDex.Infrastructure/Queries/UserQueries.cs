using MongoDB.Driver;
using RpgDex.Application.Dto;
using RpgDex.Application.Dto.User;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Entities;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Queries
{
    public class UserQueries : IUserQueries
    {
        private readonly IMongoCollection<ApplicationUser> _entity;
        public UserQueries(MongoDbContext ctx)
        {
            _entity = ctx.Users;
        }
        public async Task<UserChartResponse> GetUserChart(DateTime startDate, DateTime endDate)
        {
            var filter = Builders<ApplicationUser>.Filter.And(
                   Builders<ApplicationUser>.Filter.Gte(u => u.CreatedOn, startDate),
                   Builders<ApplicationUser>.Filter.Lte(u => u.CreatedOn, endDate));

            var groupsTask = _entity.Aggregate()
                .Match(filter)
                .Group(u => new { u.CreatedOn.Year, u.CreatedOn.Month },
                       g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
                .ToListAsync();

            var totalTask = _entity.CountDocumentsAsync(FilterDefinition<ApplicationUser>.Empty);

            await Task.WhenAll(groupsTask, totalTask);

            var points = groupsTask.Result
                .OrderBy(g => g.Year).ThenBy(g => g.Month)
                .Select(g => new ChartPoint(g.Year,g.Month, g.Count))
                .ToList();


            return new UserChartResponse(points, totalTask.Result, points.Sum(p => p.Count));
        }
    }
}
