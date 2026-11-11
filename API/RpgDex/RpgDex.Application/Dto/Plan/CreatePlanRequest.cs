using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using RpgDex.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Plan
{
    public record CreatePlanRequest(string Name, string Description, decimal Price, bool HasEarlyAccess, int CharacterQty, int CampaignQty, int DocumentsSpaceMB, int CanvasSpaceMb, int DurationDays,int Tier, List<PlanTagType> Tags);
}
