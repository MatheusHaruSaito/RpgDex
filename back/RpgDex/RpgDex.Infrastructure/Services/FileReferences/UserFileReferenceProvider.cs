using MongoDB.Driver;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Services.FileReferences
{
    public class UserFileReferenceProvider : IFileReferenceProvider
    {
        private readonly IMongoCollection<ApplicationUser> _users;

        public UserFileReferenceProvider(MongoDbContext ctx) => _users = ctx.Users;

        public async Task<IEnumerable<string>> GetReferencedFileIdsAsync(CancellationToken ct) =>
            await _users
                .Find(u => u.IconPath != null && u.IconPath != "")
                .Project(u => u.IconPath)
                .ToListAsync(ct);
    }
}
