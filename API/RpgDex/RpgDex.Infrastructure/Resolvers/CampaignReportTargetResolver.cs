using MongoDB.Driver;
using RpgDex.Application.Dto;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Enums;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using RpgDex.Infrastructure.Extension;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Resolvers
{
    public class CampaignReportTargetResolver : IReportTargetResolver
    {
        private readonly MongoDbContext _dbContext;

        private readonly IMongoCollection<ApplicationUser> _users;
        private readonly IMongoCollection<Campaign> _campaigns;
        private readonly IMongoCollection<Character> _characters;
        private readonly IFileUrlBuilder _urls;


        public CampaignReportTargetResolver(MongoDbContext dbContext, IFileUrlBuilder urls)
        {
            _dbContext = dbContext;
            _users = _dbContext.Users;
            _campaigns = _dbContext.Campaigns;
            _characters = _dbContext.Character;
            _urls = urls;
        }

        public ReportEnum Type => ReportEnum.CampaignReport;

        public async Task<object?> ResolveAsync(Guid targetId)
        {
            var campaign = await _campaigns.Find(c => c.Id == targetId).FirstOrDefaultAsync();
            if (campaign is null) return null;

            var userIds = campaign.PlayerIds.Append(campaign.GameMasterId).Distinct().ToList();
            var characterIds = campaign.CharacterIds.ToList();

            var userTask = _users.Find(u => userIds.Contains(u.Id)).ToListAsync();
            var characterTask = _characters.Find(c => characterIds.Contains(c.Id)).ToListAsync();
            await Task.WhenAll(userTask, characterTask);

            var users = userTask.Result.ToDictionary(u => u.Id);
            var characters = characterTask.Result;

            UserSummary? ToSummary(Guid id) => users.TryGetValue(id, out var u)
                ? u.ToSummary(_urls)
                : null;

            var players = campaign.PlayerIds
                .Select(id => ToSummary(id))
                .Where(s => s is not null)
                .Select(s => new CampaignPlayerSummary(
                    s!,
                    characters.Where(c => c.UserId == s!.Id).Select(c => c.Id).ToList())).ToList();

            return new ReportedCampaignProfile(
                campaign.Id, campaign.Title, campaign.Description, _urls.Build(campaign.IconPath), campaign.IsActive, campaign.CreatedAt,
                campaign.NextSession, campaign.MaxPlayers, ToSummary(campaign.GameMasterId), players,
                characters.Select(c => new CampaignCharacterSummary(c.Id, c.Name, _urls.Build(c.IconPath), c.UserId)).ToList(),
                campaign.CharacterRequests.Count());
        }
    }
}
