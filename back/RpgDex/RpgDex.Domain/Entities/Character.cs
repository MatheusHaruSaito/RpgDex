using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Entities
{
    public class Character
    {
        [BsonId]
        [BsonRepresentation(BsonType.String)]
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string IconPath { get; set; } = String.Empty;
        public string Name { get; set; }
        public string Description { get; set; } = String.Empty;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
        public DateTime LastAccess { get; set; }
        public bool IsActive { get; set; } = true;
        public BsonDocument Properties { get; set; } = new BsonDocument();

    }
}
