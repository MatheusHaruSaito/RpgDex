using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using RpgDex.Domain.ValueObjects;
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
        public string? UserIcon { get; set; } = string.Empty;
        public string Data { get; set; } = string.Empty;
        public DateTime SentAt { get; set; } = DateTime.UtcNow;
        public DateTime? EditedAt { get; set; }
        public int Version { get; private set; } = 1;
        public List<MessageRevision> History { get; set; } = new();

        private MessageRevision CreateMemento() => new()
        {
            Data = Data,
            EditedAt = DateTime.UtcNow
        };

        public void Edit(string newData)
        {
            if (string.IsNullOrWhiteSpace(newData) || newData == Data) return;

            History.Add(CreateMemento());
            Data = newData;
            EditedAt = DateTime.UtcNow;
            Version++;
        }
        public bool Restore(int historyIndex)
        {
            if (historyIndex < 0 || historyIndex >= History.Count) return false;
            var memento = History[historyIndex];
            History.Add(CreateMemento());
            Data = memento.Data;
            EditedAt = DateTime.UtcNow;
            Version++;
            return true;
        }
    }

}
