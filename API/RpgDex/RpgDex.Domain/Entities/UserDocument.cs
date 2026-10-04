using MongoDB.Bson.Serialization.Attributes;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Entities
{
    public class UserDocument
    {
        [BsonElement("UsersWithAccess")]
        private List<Guid> _usersWithAccess = new();

        public Guid Id { get; set; } = Guid.NewGuid();
        public string Name { get; set; } = string.Empty;
        public Guid UserId { get; set; }
        public string? Description { get; set; }
        public string FilePath { get; set; } = string.Empty;
        public string FileName { get; set; } = string.Empty;
        public long FileSize { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

        public IReadOnlyCollection<Guid> UsersWithAccess => _usersWithAccess.AsReadOnly();


        //IMPLEMENT ERROR MESSAGES WHEN MERGE WITH MAIN
        public bool GiveAccess(Guid id)
        {
            if (_usersWithAccess.Contains(id))
            {
                return false;
            }
            _usersWithAccess.Add(id);
            return true;
        }
        //IMPLEMENT ERROR MESSAGES WHEN MERGE WITH MAIN

        public bool RemoveAccess(Guid id)
        {
            if (!_usersWithAccess.Contains(id))
            {
                return false;
            }
            _usersWithAccess.Remove(id);
            return true;
        }
    }
}
