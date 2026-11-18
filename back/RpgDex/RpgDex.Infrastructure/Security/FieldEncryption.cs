using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;

namespace RpgDex.Infrastructure.Security
{
    public static class FieldEncryption
    {
        private const string Prefix = "enc:v1:";
        private static byte[] _key = null!;

        public static void Initialize(string base64Key)
        {
            _key = Convert.FromBase64String(base64Key);
            if (_key.Length != 32)
                throw new InvalidOperationException("The key need to have 32 bytes.");
        }

        public static string Encrypt(string plainText)
        {
            var nonce = RandomNumberGenerator.GetBytes(12);
            var plain = Encoding.UTF8.GetBytes(plainText);
            var cipher = new byte[plain.Length];
            var tag = new byte[16];

            using var aes = new AesGcm(_key, 16);
            aes.Encrypt(nonce, plain, cipher, tag);

            var payload = new byte[12 + 16 + cipher.Length];
            nonce.CopyTo(payload, 0);
            tag.CopyTo(payload, 12);
            cipher.CopyTo(payload, 28);

            return Prefix + Convert.ToBase64String(payload);
        }

        public static string Decrypt(string stored)
        {
            if (!stored.StartsWith(Prefix)) return stored;

            var payload = Convert.FromBase64String(stored[Prefix.Length..]);
            var nonce = payload.AsSpan(0, 12);
            var tag = payload.AsSpan(12, 16);
            var cipher = payload.AsSpan(28);
            var plain = new byte[cipher.Length];

            using var aes = new AesGcm(_key, 16);
            aes.Decrypt(nonce, cipher, tag, plain);

            return Encoding.UTF8.GetString(plain);
        }
    }
}
