using MongoDB.Driver;
using RpgDex.Application.Dto;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Enums;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Queries
{
    public class ReportQueries : IReportQueries
    {
        private readonly MongoDbContext _mongoDbContext;
        private readonly IMongoCollection<Report> _entitie;
        private readonly IMongoCollection<ApplicationUser> _userCollection;
        private readonly Dictionary<ReportEnum, IReportTargetResolver> _resolvers;

        public ReportQueries(MongoDbContext mongoDbContext,IEnumerable<IReportTargetResolver> resolvers)
        {
            _mongoDbContext = mongoDbContext;
            _entitie = _mongoDbContext.Reports;
            _userCollection = _mongoDbContext.Users;
            _resolvers = resolvers.ToDictionary(g => g.Type);
        }

        public async Task<ReportDetailResponse?> GetDetailAsync(Guid id)
        {
            var report = await _entitie
                .Find(r => r.Id == id)
                .FirstOrDefaultAsync();

            if (report is null) return null;
            var owner = await _userCollection
                .Find(u => u.Id == report.ReportOwner)
                .FirstOrDefaultAsync();

            object target = null;
            if (_resolvers.TryGetValue(report.ReportType, out var resolver))
                target = await resolver.ResolveAsync(report.TargetId);

            return new ReportDetailResponse(
                report.Id,
                report.Title,
                report.Description,
                report.IsActive,
                report.CreatedAt,
                report.ReportType,
                owner is null
                ? new ReportOwnerResponse(report.ReportOwner, "", "")
                : new ReportOwnerResponse(owner.Id, owner.UserName, owner.DisplayName),
                target
            );
        }
    }
}
