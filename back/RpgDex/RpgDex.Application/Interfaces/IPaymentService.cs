using RpgDex.Application.Dto.Payment;
using RpgDex.Domain.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface IPaymentService
    {
        Task<Result<PaymentInitiateResult>> PaymentInitiate(string userId, CreatePaymentRequest request);
        Task HandleWebHook(MercadoPagoWebhookDto webhook, string signatureHeader, string requestId);
        Task SyncOrderAsync(string mpOrderId);
    }
}
