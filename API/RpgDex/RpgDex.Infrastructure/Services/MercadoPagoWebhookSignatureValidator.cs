using DnsClient.Internal;
using MercadoPago.Error;
using MercadoPago.Webhook;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RpgDex.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Services
{
    public class MercadoPagoWebhookSignatureValidator(IConfiguration configuration, ILogger<MercadoPagoWebhookSignatureValidator> _logger) : IWebhookSignatureValidator
    {

        private readonly string _secret = configuration["MercadoPago:WebhookSecret"]
            ?? throw new InvalidOperationException("MercadoPago:WebhookSecret not found");

        public bool IsValid(string? signatureHeader, string? requestId, string dataId)
        {
            if (string.IsNullOrWhiteSpace(signatureHeader) || string.IsNullOrWhiteSpace(requestId))
                return false;

            try
            {
                WebhookSignatureValidator.Validate(
                    xSignature: signatureHeader,
                    xRequestId: requestId,
                    dataId: dataId,
                    secret: _secret);
                return true;
            }
            catch (InvalidWebhookSignatureException e )
            {
                _logger.LogWarning(e, "Invalid webhook signature for request {RequestId}", requestId);
                return false;
            }
        }
    }
}
