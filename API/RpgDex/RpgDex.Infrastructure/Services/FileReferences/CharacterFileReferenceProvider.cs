using MongoDB.Driver;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Services.FileReferences
{
    public class CharacterFileReferenceProvider : IFileReferenceProvider
    {
        private readonly IMongoCollection<Character> _characters;

        public CharacterFileReferenceProvider(MongoDbContext ctx) => _characters = ctx.Character;

        public async Task<IEnumerable<string>> GetReferencedFileIdsAsync(CancellationToken ct) =>
            await _characters
                .Find(c => c.IconPath != null && c.IconPath != "")
                .Project(c => c.IconPath)
                .ToListAsync(ct);
    }
}
