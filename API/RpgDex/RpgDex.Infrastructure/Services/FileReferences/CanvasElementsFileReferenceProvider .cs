using MongoDB.Driver;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Services.FileReferences
{
    internal class CanvasElementsFileReferenceProvider : IFileReferenceProvider
    {
        private readonly IMongoCollection<CanvasElement> _canvasElement;

        public CanvasElementsFileReferenceProvider(MongoDbContext ctx) => _canvasElement = ctx.CanvasElements;

        public async Task<IEnumerable<string>> GetReferencedFileIdsAsync(CancellationToken ct) =>
            await _canvasElement
                .Find(c => c.ImageUrl != null && c.ImageUrl != "")
                .Project(c => c.ImageUrl)
                .ToListAsync(ct);
    }
}
