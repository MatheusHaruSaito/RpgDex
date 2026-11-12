using Microsoft.Extensions.Logging;
using MongoDB.Driver;
using RpgDex.Application.Dto.Subscription;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Queries
{
    public class SubscriptionQueries : ISubscriptionQueries
    {
        private readonly IMongoCollection<Subscription> _entity;
        private readonly IMongoCollection<Plan> _planEntity;

        public SubscriptionQueries(MongoDbContext ctx)
        {
            _entity = ctx.Subscriptions;
            _planEntity = ctx.Plans;
        }
        public async Task<PlanLimitsDTO?> GetPlanLimitsByUserId(Guid userId)
        {
            var planId = await _entity.Find(p => p.UserId == userId && p.IsActive)
                .Project(s => s.PlanId)
                .FirstOrDefaultAsync();
            if (planId == Guid.Empty)
                return null;
            
            return await _planEntity
                    .Find(p => p.Id == planId)
                    .Project(p => new PlanLimitsDTO(
                        p.HasEarlyAccess,
                        p.CharacterQty,
                        p.CampaignQty,
                        p.DocumentsSpaceMB,
                        p.CanvasSpaceMb)).FirstOrDefaultAsync();
        }
        public async Task<IEnumerable<UserSubscriptionInfo>?> GetUserCurrentSubscriptions(Guid userId)
        {
            var now = DateTime.UtcNow;

            var subscriptions = await _entity
                .Find(s => s.UserId == userId && s.IsActive && s.StartDate <= now && s.ExpiresAt > now)
                .SortByDescending(s => s.Tier)
                .ThenByDescending(s => s.ExpiresAt)
                .Project(s => new { s.PlanId, s.ExpiresAt })
                .ToListAsync();

            if (subscriptions.Count == 0)
                return null;
            var planIds = subscriptions.Select(s => s.PlanId).Distinct().ToList();

            var plans = await _planEntity
                .Find(p => planIds.Contains(p.Id))
                .Project(p => new { p.Id, p.Name })
                .ToListAsync();


            var expiresByPlan = subscriptions
                .GroupBy(s => s.PlanId)
                .ToDictionary(g => g.Key, g => g.Max(s => s.ExpiresAt));

            return plans
                .Select(p => new UserSubscriptionInfo(p.Id, p.Name, expiresByPlan[p.Id]))
                .ToList();
        }
    }
}
