using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json.Serialization;

namespace RpgDex.Application.Dto
{
    internal class CampaignChatDto
    {
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid CampaignId { get; set; }
        public int MaxMessage { get; set; } = 100;

        public IReadOnlyCollection<CampaignChatMessagesResponse> ChatMessages;
    }
}
