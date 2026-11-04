using MongoDB.Driver;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Services
{

    public class CharacterRepository : ICharacterRepository
    {
        private readonly MongoDbContext _context;
        private readonly IMongoCollection<Character> _entity;

        public CharacterRepository(MongoDbContext context)
        {
            _context = context;
            _entity = context.Character;
        }

        public async Task<Character> InsertAsync(Character character)
        {
            await _entity.InsertOneAsync(character);

            return await _entity.Find(o => o.Id == character.Id).FirstOrDefaultAsync();
        }
        public async Task<long> GetCharactersCountByUserId(Guid userId) =>
            await _entity.CountDocumentsAsync(c => c.UserId == userId && c.IsActive);
       
        public async Task<Character> GetByIdAsync(Guid Id)
        {
            return await _entity.Find(u => u.Id == Id).FirstOrDefaultAsync();
        }

        public async Task<bool> UpdateAsync(Character newCharacter)
        {
            var filter = Builders<Character>.Filter.Eq(c => c.Id, newCharacter.Id);
            var updateCharacter = Builders<Character>.Update
                .Set(c => c.IconPath, newCharacter.IconPath)
                .Set(c => c.Name, newCharacter.Name)
                .Set(c => c.Description, newCharacter.Description)
                .Set(c => c.Properties, newCharacter.Properties);
            var result = await _entity.UpdateOneAsync(filter, updateCharacter);
            return result.ModifiedCount > 0;
        }

        public async Task<bool> SetActiveState(Guid Id, bool ActiveState)
        {
            var filter = Builders<Character>.Filter.Eq(c => c.Id, Id);
            var updateCharacter = Builders<Character>.Update
                .Set(c => c.IsActive, ActiveState);

            var result = await _entity.UpdateOneAsync(filter, updateCharacter);
            return result.ModifiedCount > 0;
        }

        public async Task<bool> UpdateLastAccessAsync(Guid id, DateTime DateNow)
        {
            var filter = Builders<Character>.Filter.Eq(c=> c.Id, id);
            var updateCharacter = Builders<Character>.Update.Set(c => c.LastAccess,DateNow);

            var result = await _entity.UpdateOneAsync(filter,updateCharacter);
            return result.ModifiedCount > 0;
        }
    }
}
