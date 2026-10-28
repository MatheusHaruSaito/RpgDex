using ImageMagick;
using MongoDB.Driver;
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
    }
}
