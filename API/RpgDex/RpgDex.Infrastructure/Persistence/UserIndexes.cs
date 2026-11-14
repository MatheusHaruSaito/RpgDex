using MongoDB.Bson;
using MongoDB.Driver;
using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Persistence
{
    public static class UserIndexes
    {
        public static async Task EnsureAsync(IMongoCollection<ApplicationUser> users)
        {
            var keys = Builders<ApplicationUser>.IndexKeys.Ascending(u => u.CpfHash);

            var options = new CreateIndexOptions<ApplicationUser>
            {
                Name = "ux_users_cpf_hash",
                Unique = true,
                PartialFilterExpression = Builders<ApplicationUser>.Filter.Type(u => u.CpfHash, BsonType.String)
            };

            await users.Indexes.CreateOneAsync(new CreateIndexModel<ApplicationUser>(keys, options));
        }
    }
}
