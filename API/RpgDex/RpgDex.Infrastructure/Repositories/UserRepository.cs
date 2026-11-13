using MongoDB.Bson;
using MongoDB.Driver;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Repositories
{
    public class UserRepository : IUserRepository
    {
        private readonly MongoDbContext _mongoDbContext;
        private readonly IMongoCollection<ApplicationUser> _users;

        public UserRepository(MongoDbContext mongoDbContext)
        {
            _mongoDbContext = mongoDbContext;
            _users = mongoDbContext.Users;
        }


        public async Task<bool> PushCharacterAsync(Guid userId, Guid characterId)
        {
            var filter = Builders<ApplicationUser>.Filter.Eq(u => u.Id, userId);
            var update = Builders<ApplicationUser>.Update
                .AddToSet(u => u.CharactersId, characterId);

            var result = await _users.UpdateOneAsync(filter, update);

            return result.ModifiedCount > 0;
        }
        public async Task<bool> PullCharacterAsync(Guid userId, Guid characterId)
        {
            var filter = Builders<ApplicationUser>.Filter.Eq(u => u.Id, userId);
            var update = Builders<ApplicationUser>.Update
                .Pull(u => u.CharactersId, characterId);

            var result = await _users.UpdateOneAsync(filter, update);

            return result.ModifiedCount > 0;
        }

        public async Task<ApplicationUser> GetByIdAsync(Guid userId)
        {
            return await _users.Find(u => u.Id == userId).FirstOrDefaultAsync();
        }
        public async Task<List<string>> GetAllProfilePhotoIdsAsync(CancellationToken ct = default)
        {
            var values = await _users
            .Find(u => u.IconPath != null && u.IconPath != "")
            .Project(u => u.IconPath)
            .ToListAsync(ct);


            return values.Where(v => ObjectId.TryParse(v, out _)).ToList();
        }
            
        public async Task<IEnumerable<ApplicationUser>> GetAllByEmailOrUserNameAsync(string target, int page, int pageSize)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize < 1 ? 1 : pageSize;
            return await _users.Find(u => u.Email!.Contains(target) ||u.UserName!.Contains( target))
                .Skip((page - 1) * pageSize)
                .Limit(pageSize)
                .ToListAsync();
        }
    }
}
