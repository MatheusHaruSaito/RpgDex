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
        public async Task<GetAllCharactersResult> GetAllByUserIdAsync(Guid userId, int page=1,int pageSize =3)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize < 1 ? 1 : pageSize;
            var filter = Builders<Character>.Filter.Eq(c => c.UserId, userId) 
                & Builders<Character>.Filter.Eq(c => c.IsActive, true);
            var reqeust= _entity.Find(filter)
                .Skip((page -1)*pageSize)
                .Limit(pageSize)
                .ToListAsync();
            var total = _entity.CountDocumentsAsync(filter);
            await Task.WhenAll(reqeust, total);
            return new GetAllCharactersResult(reqeust.Result,(int)total.Result);

        }
        public async Task<GetAllCharactersResult> GetAllByUserIdAsync(Guid userId)
        {
            var filter = Builders<Character>.Filter.Eq(c => c.UserId, userId)
                & Builders<Character>.Filter.Eq(c => c.IsActive, true);
            var result = await _entity.Find(filter)
                .ToListAsync();
            return new GetAllCharactersResult(result, result.Count());
        }
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
