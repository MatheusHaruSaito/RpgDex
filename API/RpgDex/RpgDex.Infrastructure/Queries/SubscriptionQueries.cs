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
        public async Task<PlanLimitsDTO?> GetPlanLimitsByUserId(Guid id)
        {
            var planId = await _entity.Find(p => p.Id == id)
                .Project(s => s.PlanId)
                .FirstOrDefaultAsync();
            if (planId == Guid.Empty)
                return null;

            return await _planEntity
                    .Find(p => p.Id == planId)
                    .Project(p => new PlanLimitsDTO(
                        p.HasEarlyAccess,
                        p.CharacterPerCampaignQty,
                        p.CharacterPerUserQty,
                        p.CampaignQty,
                        p.DocumentsSpaceMB,
                        p.CanvasSpaceMb)).FirstOrDefaultAsync();
        }
    }
}
