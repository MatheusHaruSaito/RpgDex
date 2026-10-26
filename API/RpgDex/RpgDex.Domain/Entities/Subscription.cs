using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Entities
{
    public class Subscription
    {
        [BsonId]
        [BsonRepresentation(BsonType.String)]
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public Guid PlanId { get; set; }
        public Guid? PaymentId { get; set; }
        public DateTime StartDate { get; set; } = DateTime.UtcNow;
        public DateTime ExpiresAt { get; set; }
        public bool isActive { get; set; } = true;

    }
}
