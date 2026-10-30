using Microsoft.Extensions.Configuration;
using MongoDB.Driver;
using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Numerics;
using System.Text;

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
        public IMongoCollection<UserDocument> UserDocuments =>
            _database.GetCollection<UserDocument>("UserDocuments");
        public IMongoCollection<ChatMessage> ChatMessage =>
            _database.GetCollection<ChatMessage>("ChatMessage");
        public IMongoCollection<Payment> Payments =>
            _database.GetCollection<Payment>("Payments");
        public IMongoCollection<Plan> Plans =>
            _database.GetCollection<Plan>("Plans");
        public IMongoCollection<Subscription> Subscriptions =>
            _database.GetCollection<Subscription>("Subscriptions");
        public IMongoCollection<CanvasElement> CanvasElements =>
            _database.GetCollection<CanvasElement>("CanvasElements");
        public IMongoDatabase GetDatabase() => _database;
    }
}
