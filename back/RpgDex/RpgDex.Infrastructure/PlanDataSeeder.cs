using Microsoft.Extensions.DependencyInjection;
using MongoDB.Driver;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Enums;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure
{
    public static class PlanDataSeeder
    {
        public static async Task SeedAsync(IServiceProvider serviceProvider, CancellationToken ct = default)
        {
            var context = serviceProvider.GetRequiredService<MongoDbContext>();
            var plans = new List<Plan>
            {
                new()
                {
                    Name = "Adventurer",
                    Description = "Para jogadores que utilizam o RpgDex com frequência.",
                    Price = 9.90m,
                    HasEarlyAccess = false,
                    CharacterQty = 15,
                    CampaignQty = 3,
                    DocumentsSpaceMB = 500,
                    CanvasSpaceMb = 500,
                    DurationDays = 30,
                    Tier = 1,
                    Tags = new List<PlanTagType> { PlanTagType.New}
                },
                new()
                {
                    Name = "Master",
                    Description = "Para mestres que organizam várias mesas.",
                    Price = 19.90m,
                    HasEarlyAccess = true,
                    CharacterQty = 50,
                    CampaignQty = 10,
                    DocumentsSpaceMB = 2 * 1024,
                    CanvasSpaceMb = 3 * 1024,
                    DurationDays = 30,
                    Tier = 2,
                    Tags = new List<PlanTagType> { PlanTagType.Recommended }
                },
                new()
                {
                    Name = "Legendary",
                    Description = "Para usuários intensivos, que administram várias campanhas.",
                    Price = 39.90m,
                    HasEarlyAccess = true,
                    CharacterQty = 150,
                    CampaignQty = 30,
                    DocumentsSpaceMB = 5 * 1024,
                    CanvasSpaceMb = 10 * 1024,
                    DurationDays = 30,
                    Tier = 3,
                    Tags = new List<PlanTagType>()
                }
            };

            foreach (var plan in plans)
            {
                var filter = Builders<Plan>.Filter.Eq(p => p.Name, plan.Name);

                var update = Builders<Plan>.Update
                    .SetOnInsert(p => p.Id, plan.Id)
                    .SetOnInsert(p => p.CreatedAt, DateTime.UtcNow)
                    .Set(p => p.Description, plan.Description)
                    .Set(p => p.Price, plan.Price)
                    .Set(p => p.HasEarlyAccess, plan.HasEarlyAccess)
                    .Set(p => p.CharacterQty, plan.CharacterQty)
                    .Set(p => p.CampaignQty, plan.CampaignQty)
                    .Set(p => p.DocumentsSpaceMB, plan.DocumentsSpaceMB)
                    .Set(p => p.CanvasSpaceMb, plan.CanvasSpaceMb)
                    .Set(p => p.DurationDays, plan.DurationDays)
                    .Set(p => p.Tier, plan.Tier)
                    .Set(p => p.Tags, plan.Tags)
                    .Set(p => p.IsActive, true);

                await context.Plans.UpdateOneAsync(
                    filter, update, new UpdateOptions { IsUpsert = true }, ct);
            }
        }
    }
}
