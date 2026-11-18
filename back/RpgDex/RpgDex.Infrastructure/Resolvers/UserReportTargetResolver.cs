using MongoDB.Driver;
using RpgDex.Application.Dto.Report;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Enums;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using RpgDex.Infrastructure.Extension;

namespace RpgDex.Infrastructure.Resolvers
{
    public class UserReportTargetResolver : IReportTargetResolver
    {
        private readonly MongoDbContext _dbContext;

        private readonly IMongoCollection<ApplicationUser> _users;
        private readonly IMongoCollection<Campaign> _campaigns;
        private readonly IMongoCollection<Character> _characters;
        private readonly IFileUrlBuilder _urls;


        public UserReportTargetResolver(MongoDbContext dbContext, IFileUrlBuilder urls)
        {
            _dbContext = dbContext;
            _users = _dbContext.Users;
            _campaigns = _dbContext.Campaigns;
            _characters = _dbContext.Character;
            _urls = urls;
        }

        public ReportEnum Type => ReportEnum.UserReport;

        public async Task<object?> ResolveAsync(Guid targetId)
        {
            var userTask = _users.Find(u => u.Id == targetId).FirstOrDefaultAsync();
            var charactersTask = _characters.CountDocumentsAsync(c => c.UserId == targetId);

            var campaignFilter = Builders<Campaign>.Filter.Or(
                Builders<Campaign>.Filter.AnyEq("PlayerIds", targetId),
                Builders<Campaign>.Filter.Eq(c => c.GameMasterId, targetId));

            var campaignsTask = _campaigns.CountDocumentsAsync(campaignFilter);
            await Task.WhenAll(userTask, charactersTask, campaignsTask);

            var user = userTask.Result;
            if (user is null) return null;

            var isLocked = user.LockoutEnabled
                && user.LockoutEnd.HasValue
                && user.LockoutEnd.Value > DateTimeOffset.UtcNow;

            return new ReportedUserProfile(
                user.ToSummary(_urls),
                (int)charactersTask.Result,
                (int)campaignsTask.Result,
                isLocked ? user.LockoutEnd : null
                );
        }
    }
}
