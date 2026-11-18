using MongoDB.Driver;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Services.FileReferences
{
    internal class UserDocumentFileReferenceProvider : IFileReferenceProvider
    {
        private readonly IMongoCollection<UserDocument> _document;

        public UserDocumentFileReferenceProvider(MongoDbContext ctx) => _document = ctx.UserDocuments;

        public async Task<IEnumerable<string>> GetReferencedFileIdsAsync(CancellationToken ct) =>
            await _document
                .Find(u => u.FilePath != null && u.FilePath != "")
                .Project(u => u.FilePath)
                .ToListAsync(ct);
    }
}
