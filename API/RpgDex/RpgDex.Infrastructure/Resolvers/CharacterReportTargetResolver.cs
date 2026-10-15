using MongoDB.Bson;
using MongoDB.Bson.IO;
using MongoDB.Driver;
using RpgDex.Application.Dto;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Enums;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using RpgDex.Infrastructure.Extension;
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;

namespace RpgDex.Infrastructure.Resolvers
{
    public class CharacterReportTargetResolver : IReportTargetResolver
    {
        private readonly MongoDbContext _dbContext;

        private readonly IMongoCollection<ApplicationUser> _users;
        private readonly IMongoCollection<Character> _characters;


        public CharacterReportTargetResolver(MongoDbContext dbContext)
        {
            _dbContext = dbContext;
            _users = _dbContext.Users;
            _characters = _dbContext.Character;
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
                character.IconPath,
                character.Description,
                character.IsActive,
                character.CreatedAt,
                character.LastAccess,
                owner?.ToSummary(),
                character.Properties.ToDictionary()
                );
        }

    }

}
