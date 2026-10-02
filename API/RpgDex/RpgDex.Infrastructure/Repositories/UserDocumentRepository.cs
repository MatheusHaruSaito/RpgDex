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
            return await _userDocuments.Find(x => x.UserId == userId)
                .Skip((page - 1) * pageSize)
                .Limit(pageSize)
                .ToListAsync();

        }

        public async Task<UserDocument> GetByIdAsync(Guid id)
        {
            return await _userDocuments.Find(x => x.Id == id).FirstOrDefaultAsync();
        }

        public async Task<UserDocument> InsertAsync(UserDocument userDocument)
        {
            await _userDocuments.InsertOneAsync(userDocument);
            return userDocument;
        }

        public async Task<bool> SetActiveState(Guid Id, bool ActiveState)
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
                .Set(x => x.FileUrl, newUserDocument.FileUrl)
                .Set(x => x.FileName, newUserDocument.FileName)
                .Set(x => x.FileSize, newUserDocument.FileSize)
                .Set(x => x.IsActive, newUserDocument.IsActive);

            var result = await _userDocuments.UpdateOneAsync(Filter, Update);
            return result.ModifiedCount > 0;
        }
    }
}
