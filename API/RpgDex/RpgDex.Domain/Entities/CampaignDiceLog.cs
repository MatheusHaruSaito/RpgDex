using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;

namespace RpgDex.Domain.Entities
{
    public class CampaignDiceLog
    {
        [BsonId]
        [BsonGuidRepresentation(GuidRepresentation.Standard)]
        public Guid CampaignId { get; set; }

        public List<DiceRoll> Rolls { get; set; } = new();
    }
    public class DiceRoll
    {
        public Guid UserId { get; set; } = default!;
        public string Expression { get; set; } = default!;
        public List<int> Results { get; set; } = new();
        public float Total { get; set; }
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    }
}
