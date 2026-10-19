using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Text;

namespace RpgDex.Domain.Entities
{
    public class ChatMessage
    {
        [BsonId]
        [BsonRepresentation(BsonType.String)]
        public Guid Id { get; set; } = Guid.NewGuid();

        [BsonRepresentation(BsonType.String)]
        public Guid CampaignId { get; set; }

        [BsonRepresentation(BsonType.String)]
        public Guid UserId { get; set; }

        public string Username { get; set; } = string.Empty;
        public string UserIcon { get; set; } = string.Empty;
        public string Data { get; set; } = string.Empty;
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
    }

}
