using RpgDex.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;

namespace RpgDex.Infrastructure.Security
{
    public class FieldHasher : IFieldHasher
    {
        private readonly byte[] _key = null!;

        public FieldHasher(string base64Key)
        {
            _key = Convert.FromBase64String(base64Key);
            if (_key.Length != 32)
                throw new InvalidOperationException("The key need to have 32 bytes.");
        }


        public string Hash(string normalizedValue)
        {
            var bytes = HMACSHA256.HashData(_key, Encoding.UTF8.GetBytes(normalizedValue));
            return Convert.ToHexString(bytes);
        }
    }
}
