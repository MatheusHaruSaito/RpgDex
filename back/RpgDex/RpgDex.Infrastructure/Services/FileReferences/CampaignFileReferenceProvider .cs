using MongoDB.Driver;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Services.FileReferences
{
    public class CampaignFileReferenceProvider : IFileReferenceProvider
    {
        private readonly IMongoCollection<Campaign> _campaigns;

        public CampaignFileReferenceProvider(MongoDbContext ctx) => _campaigns = ctx.Campaigns;

        public async Task<IEnumerable<string>> GetReferencedFileIdsAsync(CancellationToken ct) =>
            await _campaigns
                .Find(c => c.IconPath != null && c.IconPath != "")
                .Project(c => c.IconPath)
                .ToListAsync(ct);
    }
}
