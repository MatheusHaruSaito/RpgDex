using MongoDB.Driver;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Repositories
{
    public class UserDocumentRepository : IUserDocumentRepository
    {
        public readonly MongoDbContext _context;
        public readonly IMongoCollection<UserDocument> _userDocuments;
        public UserDocumentRepository(MongoDbContext context)
        {
            _context = context;
            _userDocuments = context.UserDocuments;
        }
        public async Task<IEnumerable<UserDocument>> GetAllAsync(Guid userId, int page = 1, int pageSize = 5)
        {
            var filter = Builders<UserDocument>.Filter.Eq(x => x.UserId, userId)
                & Builders<UserDocument>.Filter.Eq(x => x.IsActive,true);



            return await _userDocuments.Find(filter)
                .Skip((page - 1) * pageSize)
                .Limit(pageSize)
                .ToListAsync();

        }

        public async Task<UserDocument> GetByIdAsync(Guid id,Guid userId)
        {
            var f = Builders<UserDocument>.Filter;
            var filter = f.Eq(x => x.Id, id)
                & (f.AnyEq("UsersWithAccess", userId) | f.Eq(x => x.UserId, userId));
            return await _userDocuments.Find(filter).FirstOrDefaultAsync();
        }
        public async Task<UserDocument> InsertAsync(UserDocument userDocument)
        {
            await _userDocuments.InsertOneAsync(userDocument);
            return userDocument;
        }

        public async Task<bool> SetActiveStateAsync(Guid Id, bool ActiveState)
        {
            var Filter = Builders<UserDocument>.Filter.Eq(x => x.Id, Id);
            var Update = Builders<UserDocument>.Update.Set(x => x.IsActive, ActiveState);

            var result = await _userDocuments.UpdateOneAsync(Filter, Update);
            return result.ModifiedCount > 0;
        }

        public async Task<bool> UpdateAsync(UserDocument newUserDocument)
        {
            var Filter = Builders<UserDocument>.Filter.Eq(x => x.Id, newUserDocument.Id);
            var Update = Builders<UserDocument>.Update
                .Set(x => x.Name, newUserDocument.Name)
                .Set(x => x.Description, newUserDocument.Description)
                .Set(x => x.FilePath, newUserDocument.FilePath)
                .Set(x => x.FileName, newUserDocument.FileName)
                .Set(x => x.FileSize, newUserDocument.FileSize)
                .Set(x => x.IsActive, newUserDocument.IsActive);

            var result = await _userDocuments.UpdateOneAsync(Filter, Update);
            return result.ModifiedCount > 0;
        }
        public async Task<bool> UpdateAccessList(UserDocument newUserDocument)
        {
            var Filter = Builders<UserDocument>.Filter.Eq(x => x.Id, newUserDocument.Id);
            var Update = Builders<UserDocument>.Update
                .Set("UsersWithAccess", newUserDocument.UsersWithAccess);

            var result = await _userDocuments.UpdateOneAsync(Filter, Update);
            return result.ModifiedCount > 0;
        }
    }
}
