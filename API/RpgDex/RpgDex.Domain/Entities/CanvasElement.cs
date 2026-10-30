using MongoDB.Bson;
using MongoDB.Bson.Serialization.Attributes;
using RpgDex.Domain.ValueObjects;

namespace RpgDex.Domain.Entities
{
    public class CanvasElement
    {
        [BsonGuidRepresentation(GuidRepresentation.Standard)]
        public Guid Id { get; set; } = Guid.NewGuid();
        public Guid CampaignId { get; set; } = Guid.Empty;
        public Guid UserId { get; set; } = Guid.Empty;
        public CanvasElementType ElementType { get; set; }
        public double X { get; set; }
        public double Y { get; set; }
        public int Z { get; set; }
        public double Scale { get; set; } = 1;
        public string? Content { get; set; }
        public string? Color { get; set; }
        public string? ImageUrl { get; set; }
        public Guid? CharacterId { get; set; }
        public List<CanvasPoint>? Points { get; set; }
        public double? StrokeWidth { get; set; }
        public bool IsActive { get; set; } = true;
        public decimal ElementSize { get; set; }

    }

    public enum CanvasElementType
    {
        Token,
        Text,
        Image,
        Drawing
    }
}
