using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;
using System.Collections.ObjectModel;
using System.Text;

namespace RpgDex.Domain.Entities
{
    public class CampaignChat
    {
        [BsonElement("ChatMessages")]
        private List<ChatMessage> _chatMessages { get; set; } = new();

        public Guid Id { get; set; } =Guid.NewGuid();
        public Guid CampaignId { get; set; }
        public int MaxMessage { get; set; } = 100;

        [BsonIgnore]
        public IReadOnlyCollection<ChatMessage> ChatMessages => _chatMessages.AsReadOnly();

        public CampaignChat(Guid _campaignId)
        {
            CampaignId = _campaignId;
        }

        public void PushCampaignChat(ChatMessage message)
        {
            //Limit to don't over take a lot of the database
            int chatCount = _chatMessages.Count;
            if (chatCount >= MaxMessage && chatCount>0)
            {
                _chatMessages.RemoveAt(0);
            }
            _chatMessages.Add(message);

        }
    }
    public record ChatMessage(Guid UserId, string Username, string UserIcon, string Data, DateTime SentAt);

}
