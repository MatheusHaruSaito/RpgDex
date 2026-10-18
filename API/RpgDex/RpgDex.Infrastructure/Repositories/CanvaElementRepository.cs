using Microsoft.AspNetCore.Mvc.RazorPages;
using MongoDB.Driver;
using RpgDex.Domain.Common;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Domain.ValueObjects;
using RpgDex.Infrastructure.Data;
using System;
using System.Collections.Generic;
using System.Reflection;
using System.Text;

namespace RpgDex.Infrastructure.Repositories
{
    public class CanvaElementRepository : ICanvaElementRepository
    {
        private readonly IMongoCollection<CanvaElement> _entity;
        private const int MAX_CAMPAING_ELEMENT_PER_CAMPAING = 300;
        public CanvaElementRepository(MongoDbContext ctx)
        {
            _entity = ctx.CanvaElements;
        }
        public async Task<IEnumerable<CanvaElement>> GetAllElementsByCampaignAsync(Guid campaignId, int page = 1, int pageSize = 20)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize < 1 ? 1 : pageSize;
            var filter =  Builders<CanvaElement>.Filter.And(
                Builders<CanvaElement>.Filter.Eq(e => e.CampaignId, campaignId),
                Builders<CanvaElement>.Filter.Eq(e => e.IsActive, true));
            var elements = await _entity.Find(filter)
                .Skip((page - 1) * pageSize)
                .Limit(pageSize)
                .ToListAsync();

            return elements;
        }

        public async Task<CanvaElement> InsertElementAsync(CanvaElement canvaElement)
        {
            var elementCount = await _entity.CountDocumentsAsync(e => e.CampaignId == canvaElement.CampaignId);
            if(elementCount >= MAX_CAMPAING_ELEMENT_PER_CAMPAING)
            {
                return null;
            }
            await _entity.InsertOneAsync(canvaElement);
            return canvaElement;
        }

        public async Task<bool> UpdateElementAsync(CanvaElement newElement)
        {
            var filter = Builders<CanvaElement>.Filter.And(
                Builders<CanvaElement>.Filter.Eq( e => e.Id, newElement.Id),
                Builders<CanvaElement>.Filter.Eq( e => e.CampaignId, newElement.CampaignId)
                );
            var update = Builders<CanvaElement>.Update
                .Set(x => x.X, newElement.X)
                .Set(x => x.Y, newElement.Y)
                .Set(x => x.Z, newElement.Z)
                .Set(x => x.Scale, newElement.Scale)
                .Set(x => x.Content, newElement.Content)
                .Set(x => x.Color, newElement.Color)
                .Set(x => x.ImageUrl, newElement.ImageUrl)
                .Set(x => x.Points, newElement.Points)
                .Set(x => x.StrokeWidth, newElement.StrokeWidth);

            var result = await _entity.UpdateOneAsync(filter, update);
            return result.MatchedCount > 0;
        }
        public async Task<bool> MoveElementAsync(Guid campaignId, IEnumerable<ElementPosition> items)
        {

            var models = items.Select(i => new UpdateOneModel<CanvaElement>(
                Builders<CanvaElement>.Filter.Where(e => e.Id == i.Id && e.CampaignId == campaignId),
                Builders<CanvaElement>.Update
                .Set(e => e.X, i.X)
                .Set(e => e.Y, i.Y))).ToList();

            if (models.Count == 0) return true;

            var result = await _entity.BulkWriteAsync(models, new BulkWriteOptions{ IsOrdered = false });
            return result.IsAcknowledged && result.MatchedCount == models.Count;
        }
        public async Task<bool> MoveElementAsync(Guid campaignId, ElementPosition item)
        {
            var filter = Builders<CanvaElement>.Filter.Where(e => e.Id == item.Id && e.CampaignId == campaignId);
            var update = Builders<CanvaElement>.Update.Set(e => e.X, item.X).Set(e => e.Y, item.Y);

            var result = await _entity.UpdateOneAsync(filter, update);
            return result.MatchedCount > 0;
        }
        public async Task<bool> ReorderElementsAsync(Guid campaignId, IEnumerable<ElementOrder> items)
        {
            var models = items.Select(i => new UpdateOneModel<CanvaElement>(
                Builders<CanvaElement>.Filter.Where(e => e.Id == i.Id && e.CampaignId == campaignId),
                Builders<CanvaElement>.Update.Set(e => e.Z, i.Z)))
                .ToList();

            if (models.Count == 0) return true;

            var result = await _entity.BulkWriteAsync(models, new BulkWriteOptions { IsOrdered = false });
            return result.IsAcknowledged && result.MatchedCount == models.Count;
        }

        public async Task<bool> SetActiveState(Guid id,Guid campaignId, bool state)
        {
            var filter = Builders<CanvaElement>.Filter.Where(e => e.Id == id && e.CampaignId == campaignId);
            var update = Builders<CanvaElement>.Update.Set(e => e.IsActive, state);
            var result = await _entity.UpdateOneAsync(filter, update);
            return result.IsAcknowledged && result.MatchedCount > 0;
        }
    }
}
