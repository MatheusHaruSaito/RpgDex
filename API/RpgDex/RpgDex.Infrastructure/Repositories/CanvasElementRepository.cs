using MongoDB.Driver;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Domain.ValueObjects;
using RpgDex.Infrastructure.Data;


namespace RpgDex.Infrastructure.Repositories
{
    public class CanvasElementRepository : ICanvasElementRepository
    {
        private readonly IMongoCollection<CanvasElement> _entity;
        public CanvasElementRepository(MongoDbContext ctx)
        {
            _entity = ctx.CanvasElements;
        }
        public async Task<CanvasElement> GetByIdAsync(Guid campaignId, Guid id)
        {
            var filter = Builders<CanvasElement>.Filter.And(
                Builders<CanvasElement>.Filter.Eq(e => e.Id, id),
                Builders<CanvasElement>.Filter.Eq(e => e.CampaignId, campaignId));
            return await _entity.Find(filter).FirstOrDefaultAsync();
        }

        public async Task<CanvasElement> InsertElementAsync(CanvasElement canvaElement)
        {
            await _entity.InsertOneAsync(canvaElement);
            return canvaElement;
        }
        public async Task<int> CountByCampaignAsync(Guid campaignId)
        {
            var count = await _entity.CountDocumentsAsync(e => e.CampaignId == campaignId);
            return (int)count;
        }
        public async Task<bool> UpdateElementAsync(CanvasElement newElement)
        {
            var filter = Builders<CanvasElement>.Filter.And(
                Builders<CanvasElement>.Filter.Eq( e => e.Id, newElement.Id),
                Builders<CanvasElement>.Filter.Eq( e => e.CampaignId, newElement.CampaignId)
                );
            var update = Builders<CanvasElement>.Update
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

            var models = items.Select(i => new UpdateOneModel<CanvasElement>(
                Builders<CanvasElement>.Filter.Where(e => e.Id == i.Id && e.CampaignId == campaignId),
                Builders<CanvasElement>.Update
                .Set(e => e.X, i.X)
                .Set(e => e.Y, i.Y))).ToList();

            if (models.Count == 0) return true;

            var result = await _entity.BulkWriteAsync(models, new BulkWriteOptions{ IsOrdered = false });
            return result.IsAcknowledged && result.MatchedCount == models.Count;
        }
        public async Task<bool> MoveElementAsync(Guid campaignId, ElementPosition item)
        {
            var filter = Builders<CanvasElement>.Filter.Where(e => e.Id == item.Id && e.CampaignId == campaignId);
            var update = Builders<CanvasElement>.Update.Set(e => e.X, item.X).Set(e => e.Y, item.Y);

            var result = await _entity.UpdateOneAsync(filter, update);
            return result.MatchedCount > 0;
        }
        public async Task<bool> ReorderElementsAsync(Guid campaignId, IEnumerable<ElementOrder> items)
        {
            var models = items.Select(i => new UpdateOneModel<CanvasElement>(
                Builders<CanvasElement>.Filter.Where(e => e.Id == i.Id && e.CampaignId == campaignId),
                Builders<CanvasElement>.Update.Set(e => e.Z, i.Z)))
                .ToList();

            if (models.Count == 0) return true;

            var result = await _entity.BulkWriteAsync(models, new BulkWriteOptions { IsOrdered = false });
            return result.IsAcknowledged && result.MatchedCount == models.Count;
        }

        public async Task<bool> SetActiveState(IEnumerable<Guid> ids, Guid campaignId, bool state)
        {
            var models = ids.Select(i => new UpdateOneModel<CanvasElement>(
                    Builders<CanvasElement>.Filter.Where(e => e.Id == i && e.CampaignId == campaignId),
                    Builders<CanvasElement>.Update.Set(e => e.IsActive,state)))
                    .ToList();

            var result = await _entity.BulkWriteAsync(models, new BulkWriteOptions { IsOrdered = false });
            return result.IsAcknowledged && result.MatchedCount == models.Count;
        }

    }
}
