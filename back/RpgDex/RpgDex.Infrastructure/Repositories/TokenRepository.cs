using AspNetCore.Identity.MongoDbCore.Models;
using MongoDB.Driver;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Repositories
{
    public class TokenRepository : ITokenRepository
    {
        private readonly MongoDbContext _dbContext;
        private readonly IMongoCollection<RefreshToken> _refreshTokens;
        public TokenRepository(MongoDbContext dbContext)
        {
            _dbContext = dbContext;
            _refreshTokens = _dbContext.RefreshTokens;
        }

        public async Task<bool> DeleteTokenByUserIdAsync(Guid userId)
        {
            var filter = Builders<RefreshToken>.Filter.Eq(t => t.UserId, userId);
            var deletedToken = await _refreshTokens.DeleteOneAsync(filter);
            return deletedToken.DeletedCount > 0;
        }
        public Task DeleteAllUserRefreshTokensByUserIdAsync(Guid userId)=>
            _refreshTokens.DeleteManyAsync(t => t.UserId == userId);

        public async Task<bool> DeleteTokenByValueAsync(string token)
        {
             var filter = Builders<RefreshToken>.Filter.Eq(t => t.Token, token);
             var deletedToken = await _refreshTokens.DeleteOneAsync(filter);
            return deletedToken.DeletedCount > 0;
        }

        public async Task<RefreshToken> GetRefreshTokenByTokenAsync(string token)
        {
            return await _refreshTokens.Find(t => t.Token == token).FirstOrDefaultAsync();
        }
        public async Task<RefreshToken> GetRefreshTokenByUserIdAsync(Guid userId)
        {
            return await _refreshTokens.Find(t => t.UserId == userId).FirstOrDefaultAsync();
        }
        public async Task<RefreshToken> StoreTokenAsync(RefreshToken token)
        {
            await _refreshTokens.InsertOneAsync(token);

            return await _refreshTokens.Find(t => t.Id  == token.Id).FirstOrDefaultAsync();
        }
        
    }
}
