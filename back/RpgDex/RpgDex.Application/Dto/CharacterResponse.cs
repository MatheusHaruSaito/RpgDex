using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes; 
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public class CharacterResponse
    {
        public Guid Id { get; set; }
        public Guid UserId { get; set; }
        public string IconPath { get; set; }
        public string Name { get; set; }
        public string Description { get; set; }
        public DateTime CreatedAt { get; set; }
        public DateTime LastAccess { get; set; }
        public Dictionary<string, object> Properties { get; set; } = new Dictionary<string, object>();

    }
}
