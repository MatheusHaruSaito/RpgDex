using DnsClient.Internal;
using MercadoPago.Error;
using MercadoPago.Webhook;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RpgDex.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;

namespace RpgDex.Infrastructure.Services
{
    public class MercadoPagoWebhookSignatureValidator : IWebhookSignatureValidator
    {
        private readonly byte[] _key;
        private readonly ILogger<MercadoPagoWebhookSignatureValidator> _logger;

        public MercadoPagoWebhookSignatureValidator(
            IConfiguration configuration,
            ILogger<MercadoPagoWebhookSignatureValidator> logger)
        {
            var secret = configuration["MercadoPago:WebhookSecret"];
            if (string.IsNullOrWhiteSpace(secret))
                throw new InvalidOperationException("MercadoPago:WebhookSecret is missing or empty");

            _key = Encoding.UTF8.GetBytes(secret);
            _logger = logger;
        }

        public bool IsValid(string? signatureHeader, string? requestId, string dataId)
        {
            if (string.IsNullOrWhiteSpace(signatureHeader) ||
                string.IsNullOrWhiteSpace(requestId) ||
                string.IsNullOrWhiteSpace(dataId))
                return false;

            string? ts = null, v1 = null;
            foreach (var part in signatureHeader.Split(','))
            {
                var kv = part.Split('=', 2);
                if (kv.Length != 2) continue;
                var name = kv[0].Trim();
                var value = kv[1].Trim();
                if (name == "ts") ts = value;
                else if (name == "v1") v1 = value;
            }

            if (ts is null || v1 is null)
            {
                _logger.LogWarning("x-signature without ts/v1 for request {RequestId}", requestId);
                return false;
            }

            var manifest = $"id:{dataId.ToLowerInvariant()};request-id:{requestId};ts:{ts};";

            using var hmac = new HMACSHA256(_key);
            var computed = Convert.ToHexString(hmac.ComputeHash(Encoding.UTF8.GetBytes(manifest))).ToLowerInvariant();

            var ok = CryptographicOperations.FixedTimeEquals(
                Encoding.UTF8.GetBytes(computed),
                Encoding.UTF8.GetBytes(v1.ToLowerInvariant()));

            if (!ok)
                _logger.LogWarning("Invalid webhook signature for request {RequestId}", requestId);

            return ok;
        }
    }
}
