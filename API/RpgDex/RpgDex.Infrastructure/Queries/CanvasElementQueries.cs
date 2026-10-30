using Microsoft.Extensions.Options;
using MongoDB.Driver;
using RpgDex.Application.Dto.Canvas;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Data;
using RpgDex.Infrastructure.Settings;
using System;
using System.Buffers.Text;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Queries
{
    public class CanvasElementQueries : ICanvasElementQueries
    {
        private readonly IMongoCollection<CanvasElement> _entity;
        private readonly IMongoCollection<Character> _characterEntity;
        private readonly ICanvasElementRepository _canvasElementRepository;
        private readonly ApiSettings _apiSettings;


        public CanvasElementQueries(MongoDbContext ctx, ICanvasElementRepository canvasElementRepository, IOptions<ApiSettings> apiSettings)
        {
            _entity = ctx.CanvasElements;
            _characterEntity = ctx.Character;
            _canvasElementRepository = canvasElementRepository;
            _apiSettings = apiSettings.Value;
        }
        public async Task<GetAllCanvasElementResponse> GetAllCanvasElementByCampaignIdAsync(Guid campaignId, int page = 1, int pageSize = 20)
        {
            page = page < 1 ? 1 : page;
            pageSize = pageSize < 1 ? 1 : pageSize;
            var filter = Builders<CanvasElement>.Filter.And(
                Builders<CanvasElement>.Filter.Eq(e => e.CampaignId, campaignId),
                Builders<CanvasElement>.Filter.Eq(e => e.IsActive, true));
            var elements = await _entity.Find(filter)
                .Skip((page - 1) * pageSize)
                .Limit(pageSize)
                .ToListAsync();
            var characterIds = elements
                .Where(e => e.ElementType == CanvasElementType.Token && e.CharacterId is not null)
                .Select(e => e.CharacterId)
                .Distinct()
                .ToList();

            var icons = new Dictionary<Guid, string?>();
            if (characterIds.Count > 0)
            {
                var characters = await _characterEntity
                    .Find(c => characterIds.Contains(c.Id))
                    .Project(c => new { c.Id, c.IconPath })
                    .ToListAsync();

                icons = characters.ToDictionary(c => c.Id, c => (string?)c.IconPath);
            }
            var items = elements.Select(e =>
            {
                var imageUrl = e.ImageUrl;

                if (e.ElementType == CanvasElementType.Token
                    && e.CharacterId.HasValue
                    && icons.TryGetValue(e.CharacterId.Value, out var icon))
                    {
                        imageUrl = icon;
                    }

                return new CanvasElementResponse(
                    e.Id, e.ElementType, e.X, e.Y, e.Z, e.Scale,
                    e.Content, e.Color,
                    String.IsNullOrWhiteSpace(imageUrl) ? null:$"{_apiSettings.BaseUrl}/api/File/{imageUrl}",
                    e.Points, e.StrokeWidth,
                    e.CharacterId);
            }).ToList();
            var count = await _canvasElementRepository.GetCanvasSizeByCampaignIdAsync(campaignId);
            return new(items, (decimal)count);
        }
    }
}
