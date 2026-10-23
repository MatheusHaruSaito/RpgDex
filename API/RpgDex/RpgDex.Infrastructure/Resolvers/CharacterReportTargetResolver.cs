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
    public class CharacterReportTargetResolver : IReportTargetResolver
    {
        private readonly MongoDbContext _dbContext;

        private readonly IMongoCollection<ApplicationUser> _users;
        private readonly IMongoCollection<Character> _characters;
        private readonly IFileUrlBuilder _urls;

        public CharacterReportTargetResolver(MongoDbContext dbContext, IFileUrlBuilder urls)
        {
            _dbContext = dbContext;
            _users = _dbContext.Users;
            _characters = _dbContext.Character;
            _urls = urls;
        }

        public ReportEnum Type => ReportEnum.CharacterReport;

        public async Task<object?> ResolveAsync(Guid targetId)
        {
            var character = await _characters.Find(c => c.Id == targetId).FirstOrDefaultAsync();
            if (character is null) return null;

            var owner = await _users.Find(u => u.Id == character.UserId).FirstOrDefaultAsync();

            return new ReportedCharacterProfile(
                character.Id,
                character.Name,
                _urls.Build(character.IconPath),
                character.Description,
                character.IsActive,
                character.CreatedAt,
                character.LastAccess,
                owner?.ToSummary(_urls),
                character.Properties.ToDictionary()
                );
        }

    }

}
