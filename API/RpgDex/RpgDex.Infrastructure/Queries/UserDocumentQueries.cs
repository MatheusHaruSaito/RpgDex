using ImageMagick;
using Mapster;
using MongoDB.Driver;
using RpgDex.Application.Dto.UserDocument;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Entities;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Queries
{
    public class UserDocumentQueries : IUserDocumentQueries
    {
        private readonly IMongoCollection<UserDocument> _entity;
        public UserDocumentQueries(MongoDbContext ctx)
        {
            _entity = ctx.UserDocuments;
        }
        public async Task<decimal> GetDocumentStorageInMbByUserId(Guid userId)
        {
            var result = await _entity.Aggregate()
            .Match(d => d.UserId == userId && d.IsActive)
            .Group(d => d.UserId, g => new { TotalBytes = g.Sum(x => (long)x.FileSize) })
            .FirstOrDefaultAsync();

            var totalBytes = result?.TotalBytes ?? 0L;
            return totalBytes / 1024m / 1024m;
        }
        public async Task<GetAllUserDocumentResponse> GetAllAsync(Guid userId, int page = 1, int pageSize = 5)
        {
            var filter = Builders<UserDocument>.Filter.Eq(x => x.UserId, userId)
                & Builders<UserDocument>.Filter.Eq(x => x.IsActive, true);

             var elements = await _entity.Find(filter)
                .Skip((page - 1) * pageSize)
                .Limit(pageSize)
                .ToListAsync();

            var currentSize =  await GetDocumentStorageInMbByUserId(userId);
            return new GetAllUserDocumentResponse(elements.Adapt<IEnumerable<UserDocumentResponse>>(), currentSize, 0);
        }

    }
}
