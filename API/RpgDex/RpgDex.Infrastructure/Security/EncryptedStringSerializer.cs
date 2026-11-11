using MongoDB.Bson.Serialization;
using MongoDB.Bson.Serialization.Serializers;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Security
{
    public class EncryptedStringSerializer : SerializerBase<string>
    {
        public override void Serialize(BsonSerializationContext context, BsonSerializationArgs args, string value)
        {
            if (value is null) { context.Writer.WriteNull(); return; }
            context.Writer.WriteString(FieldEncryption.Encrypt(value));
        }

        public override string Deserialize(BsonDeserializationContext context, BsonDeserializationArgs args)
        {
            if (context.Reader.CurrentBsonType == MongoDB.Bson.BsonType.Null)
            {
                context.Reader.ReadNull();
                return null!;
            }
            return FieldEncryption.Decrypt(context.Reader.ReadString());
        }
    }
}
