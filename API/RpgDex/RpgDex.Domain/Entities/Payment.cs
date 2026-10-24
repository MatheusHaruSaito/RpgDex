using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using RpgDex.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Entities
{
    public class Payment
    {
        [BsonId]
        [BsonRepresentation(BsonType.String)]
        public Guid Id { get; set; }
        public string? MpOrderId { get; set; }
        public Guid UserId { get; set; }
        public Guid PlanId { get; set; }
        public DateTime Date { get; set; } = DateTime.UtcNow;
        public decimal Amount { get; set; }
        public string Method { get; set; } = default!;
        public PaymentStatus Status { get; set; } = PaymentStatus.Pending;

    }
}
