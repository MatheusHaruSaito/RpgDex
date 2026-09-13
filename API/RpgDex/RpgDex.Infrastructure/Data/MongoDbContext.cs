using MongoDB.Driver;
using Microsoft.Extensions.Configuration;
using System;
using System.Collections.Generic;
using System.Text;
using RpgDex.Domain.Entities;

namespace RpgDex.Infrastructure.Data
{
    public class MongoDbContext
    {
        private readonly IMongoDatabase _database;

        public MongoDbContext(IConfiguration configuration)
        {
            var connectionString = configuration.GetConnectionString("MongoDbConnection");
            var databaseName = configuration["ConnectionStrings:DatabaseName"];

            var client = new MongoClient(connectionString);
            _database = client.GetDatabase(databaseName);
        }

        public IMongoCollection<ApplicationUser> Users =>
            _database.GetCollection<ApplicationUser>("applicationUsers");
        public IMongoCollection<ApplicationRole> Roles =>
            _database.GetCollection<ApplicationRole>("applicationRoles");
        public IMongoCollection<Character> Character =>
            _database.GetCollection<Character>("Characters");
        public IMongoCollection<RefreshToken> RefreshTokens =>
            _database.GetCollection<RefreshToken>("RefreshTokens");
        public IMongoCollection<Campaign> Campaigns =>
            _database.GetCollection<Campaign>("Campaigns");
        public IMongoCollection<CampaignChat> CampaignChat =>
            _database.GetCollection<CampaignChat>("CampaignChat");
        public IMongoDatabase GetDatabase() => _database;
    }
}
