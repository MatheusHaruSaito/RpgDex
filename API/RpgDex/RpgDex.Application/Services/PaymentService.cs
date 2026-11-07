using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using RpgDex.Application.Dto.Payment;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Common;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Enums;
using RpgDex.Domain.Interfaces;
using RpgDex.Domain.ValueObjects;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Security.Cryptography;
using System.Text;
namespace RpgDex.Application.Services
{
    public class PaymentService(IPaymentRepository paymentRepository, IPlanRepository planRepository, IUserRepository userRepository, IConfiguration configuration, IMercadoPagoOrderClient mpOrderClient,
        ILogger<PaymentService> _logger, ISubscriptionRepository subscriptionRepository, IWebhookSignatureValidator webHookValidator) : IPaymentService
    {
        public async Task<Result<PaymentInitiateResult>> PaymentInitiate(string userId, CreatePaymentRequest request)
        {
            if (!Guid.TryParse(userId, out var userIdGuid)) return Result<PaymentInitiateResult>.Failure(Error.InvalidUserId);
            var user = await userRepository.GetByIdAsync(userIdGuid);
            if (user is null)
            {
                return Result<PaymentInitiateResult>.Failure(AuthError.UserNotFound);
            }
            var plan = await planRepository.GetById(request.PlanId);
            if (plan is null)
            {
                return Result<PaymentInitiateResult>.Failure(PlanError.NotFound);
            }
            var successUrl = configuration["MercadoPago:SuccessUrl"]
                ?? throw new InvalidOperationException("MercadoPago:SuccessUrl not found");

            var failureUrl = configuration["MercadoPago:FailureUrl"];
            var pendingUrl = configuration["MercadoPago:PendingUrl"];
            var amount = plan.Price.ToString("F2", CultureInfo.InvariantCulture);
            var paymentId = Guid.NewGuid();
            var orderRequest = new MpCreateOrderRequest
            {
                TotalAmount = amount,
                ExternalReference = paymentId.ToString(),
                Payer = new MpOrderPayer
                {
                    Email = user.Email,
                    FirstName = user.UserName,
                    //Identification = new MpOrderIdentification
                    //{
                    //    Number = "12345678909"
                    //}
                },
                Items =
                [
                    new MpOrderItem
                    {
                        Title = plan.Name,
                        Description = plan.Description,
                        UnitPrice = amount,
                        Quantity = 1
                    }
                ],
                Config = new MpOrderConfig
                {
                    Online = new MpOnlineConfig
                    {
                        SuccessUrl = successUrl,
                        FailureUrl = failureUrl,
                        PendingUrl = pendingUrl,
                        AutoReturn = "approved"
                    }
                },
                AdditionalInfo = new MpOrderAdditionalInfo
                {
                    PayerRegistrationDate = user.CreatedOn.ToString("O", CultureInfo.InvariantCulture),
                }
            };

            var order = await mpOrderClient.CreateAsync(orderRequest, paymentId.ToString());
            if (string.IsNullOrEmpty(order.Id) || string.IsNullOrEmpty(order.CheckoutUrl))
                return Result<PaymentInitiateResult>.Failure(MercadoPagoOrderError.CreationFailed);

            var payment = new Payment
            {
                Id = paymentId,
                Amount = plan.Price,
                Status = Domain.Enums.PaymentStatus.Pending,
                Date = DateTime.UtcNow,
                UserId = userIdGuid,
                PlanId = request.PlanId,
                MpOrderId = order.Id
            };

            await paymentRepository.Insert(payment);
            var result = new PaymentInitiateResult(paymentId, order.CheckoutUrl);
            return Result<PaymentInitiateResult>.Success(result);
        }
        public async Task HandleWebHook(MercadoPagoWebhookDto webhook, string signatureHeader, string requestId)
        {
            var dataId = webhook.Data?.Id;
            if (string.IsNullOrWhiteSpace(dataId)) return;

            var validate = configuration.GetValue("MercadoPago:ValidateWebhookSignature", true);
            if (validate && !webHookValidator.IsValid(signatureHeader, requestId, dataId))
            {
                _logger.LogWarning("Invalid MP webhook signature for data.id {DataId}", dataId);
                return;
            }

            if (webhook.Type is not null && !webhook.Type.Contains("order", StringComparison.OrdinalIgnoreCase))
            {
                _logger.LogInformation("Ignoring MP webhook of type {Type}", webhook.Type);
                return;
            }

            await SyncOrderAsync(dataId);
            //var dataId = webhook.Data?.Id;
            //if (string.IsNullOrWhiteSpace(dataId))
            //    return;

            //var validate = configuration.GetValue("MercadoPago:ValidateWebHookSignature", true);

            //if (validate && !webHookValidator.IsValid(signatureHeader, requestId, dataId))
            //{
            //    _logger.LogWarning("Invalid MP webhook signature for data.id {DataId}", dataId);
            //    return;
            //}
            //if (webhook.Type is not null && !webhook.Type.Contains("order", StringComparison.OrdinalIgnoreCase))
            //{
            //    _logger.LogInformation("Ignoring MP webhook of type {Type}", webhook.Type);
            //    return;
            //}

            //var order = await mpOrderClient.GetAsync(dataId);
            //if (order is null)
            //{
            //    _logger.LogWarning("MP order {DataId} not found (simulated notification?)", dataId);
            //    return;
            //}
            //Payment? payment = null;
            //if (Guid.TryParse(order.ExternalReference, out var paymentId))
            //    payment = await paymentRepository.GetById(paymentId);

            //if (payment is null && !string.IsNullOrWhiteSpace(order.Id))
            //    payment = await paymentRepository.GetByMpOrderId(order.Id);
            //if (payment is null)
            //{
            //    _logger.LogWarning("No payment found for MP order {OrderId} / ref {Ref}", order.Id, order.ExternalReference);
            //    return;
            //}

            //var newStatus = MapStatus(order.Status);
            //if (newStatus == PaymentStatus.Unknown)
            //{
            //    _logger.LogWarning("Unmapped MP order status {Status}/{Detail}", order.Status, order.StatusDetail);
            //    return;
            //}

            //if (payment.Status == PaymentStatus.Confirmed && newStatus == PaymentStatus.Pending)
            //{
            //    _logger.LogInformation("Ignoring regression to Pending for confirmed payment {Id}", payment.Id);
            //    return;
            //}

            //if (newStatus == PaymentStatus.Confirmed)
            //{
            //    var plan = await planRepository.GetById(payment.PlanId);
            //    if (plan is null)
            //    {
            //        _logger.LogError("Plan {PlanId} not found for payment {PaymentId}", payment.PlanId, payment.Id);
            //        return;
            //    }

            //    if (!await subscriptionRepository.ExistsByPaymentId(payment.Id))
            //    {
            //        await subscriptionRepository.Insert(new Subscription
            //        {
            //            Id = Guid.NewGuid(),
            //            UserId = payment.UserId,
            //            PaymentId = payment.Id,
            //            PlanId = payment.PlanId,
            //            ExpiresAt = DateTime.UtcNow.AddDays(plan.DurationDays)
            //        });
            //        _logger.LogInformation("Subscription created for payment {Id}", payment.Id);
            //    }
            //}

            //if (payment.Status != newStatus)
            //{
            //    await paymentRepository.UpdatePaymentStatus(payment.Id, newStatus);
            //    _logger.LogInformation("Payment {Id} updated to {Status}", payment.Id, newStatus);
            //}
            //else
            //{
            //    _logger.LogInformation("Payment {Id} already {Status}", payment.Id, newStatus);
            //}
        }
        private static PaymentStatus MapStatus(string? mp) => mp switch
        {
            "created" or "processing" or "action_required" => PaymentStatus.Pending,
            "processed" => PaymentStatus.Confirmed,
            "refunded" => PaymentStatus.Refunded,
            "canceled" => PaymentStatus.Failed,
            "failed" => PaymentStatus.Failed,
            _ => PaymentStatus.Unknown
        };

        public async Task SyncOrderAsync(string mpOrderId)
        {
            var order = await mpOrderClient.GetAsync(mpOrderId);
            if (order is null)
            {
                _logger.LogWarning("MP order {Id} not found", mpOrderId);
                return;
            }
            Payment? payment = null;
            if (Guid.TryParse(order.ExternalReference, out var paymentId))
                payment = await paymentRepository.GetById(paymentId);

            if (payment is null && !string.IsNullOrWhiteSpace(order.Id))
                payment = await paymentRepository.GetByMpOrderId(order.Id);
            if (payment is null)
            {
                _logger.LogWarning("No payment found for MP order {OrderId} / ref {Ref}", order.Id, order.ExternalReference);
                return;
            }

            var newStatus = MapStatus(order.Status);
            if (newStatus == PaymentStatus.Unknown)
            {
                _logger.LogWarning("Unmapped MP order status {Status}/{Detail}", order.Status, order.StatusDetail);
                return;
            }

            if (payment.Status == PaymentStatus.Confirmed && newStatus == PaymentStatus.Pending)
            {
                _logger.LogInformation("Ignoring regression to Pending for confirmed payment {Id}", payment.Id);
                return;
            }

            if (newStatus == PaymentStatus.Confirmed)
            {
                var plan = await planRepository.GetById(payment.PlanId);
                if (plan is null)
                {
                    _logger.LogError("Plan {PlanId} not found for payment {PaymentId}", payment.PlanId, payment.Id);
                    return;
                }

                await ApplyConfirmedPaymentAsync(payment, plan);
            }

            if (newStatus == PaymentStatus.Refunded && payment.Status == PaymentStatus.Confirmed)
                await RevertPaymentAsync(payment);
            if (payment.Status != newStatus)
            {
                await paymentRepository.UpdatePaymentStatus(payment.Id, newStatus);
                _logger.LogInformation("Payment {Id} updated to {Status}", payment.Id, newStatus);
            }
            else
            {
                _logger.LogInformation("Payment {Id} already {Status}", payment.Id, newStatus);
            }
        }
        private async Task ApplyConfirmedPaymentAsync(Payment payment, Plan plan)
        {
            if (await subscriptionRepository.ExistsByPaymentId(payment.Id))
            {
                _logger.LogInformation("Payment {Id} already applied", payment.Id);
                return;
            }

            var now = DateTime.UtcNow;
            var duration = TimeSpan.FromDays(plan.DurationDays);
            var live = await subscriptionRepository.GetLiveByUserAsync(payment.UserId, now);

            // 1. empurra os de nível inferior
            foreach (var lower in live.Where(s => s.Tier < plan.Tier))
            {
                await UpdateWithRetryAsync(lower, payment.Id, LedgerEntryKind.Shifted,
                    s => (s.StartDate > now ? s.StartDate + duration : s.StartDate, s.ExpiresAt + duration));
            }

            // 2. mesmo plano: estende
            var same = live.Where(s => s.PlanId == plan.Id).OrderByDescending(s => s.ExpiresAt).FirstOrDefault();
            if (same is not null)
            {
                await UpdateWithRetryAsync(same, payment.Id, LedgerEntryKind.Extended,
                    s => (s.StartDate, s.ExpiresAt + duration));
                _logger.LogInformation("Subscription {SubId} extended by payment {Id}", same.Id, payment.Id);
                return;
            }

            // 3. senão cria (na fila, se houver nível maior ou igual)
            var blockerEnd = live.Where(s => s.Tier >= plan.Tier)
                                 .Select(s => (DateTime?)s.ExpiresAt)
                                 .Max();
            var start = blockerEnd is { } end && end > now ? end : now;

            await subscriptionRepository.Insert(new Subscription
            {
                Id = Guid.NewGuid(),
                UserId = payment.UserId,
                PaymentId = payment.Id,
                PlanId = plan.Id,
                Tier = plan.Tier,
                StartDate = start,
                ExpiresAt = start + duration,
                IsActive = true,
                Ledger =
                [
                    new SubscriptionLedgerEntry
            {
                PaymentId = payment.Id,
                Kind = LedgerEntryKind.Created,
                StartDeltaTicks = 0,
                ExpiresDeltaTicks = duration.Ticks
            }
                ]
            });
            _logger.LogInformation("Subscription created for payment {Id}, starting {Start}", payment.Id, start);
        }

        private async Task UpdateWithRetryAsync(Subscription sub, Guid paymentId, LedgerEntryKind kind, Func<Subscription, (DateTime Start, DateTime Expires)> compute)
        {
            for (var attempt = 0; attempt < 3; attempt++)
            {
                var (start, expires) = compute(sub);
                if (await subscriptionRepository.TryUpdateAsync(sub, start, expires, paymentId, kind))
                    return;

                // falhou: já aplicado por outra execução, ou a assinatura mudou. Recarrega e decide.
                var fresh = await subscriptionRepository.GetById(sub.Id);
                if (fresh is null) return;
                if (fresh.Ledger.Any(e => e.PaymentId == paymentId && e.Kind == kind)) return;

                sub = fresh;
            }

            throw new InvalidOperationException($"Could not update subscription {sub.Id} for payment {paymentId}");
        }
        private async Task RevertPaymentAsync(Payment payment)
        {
            var affected = await subscriptionRepository.GetByLedgerPaymentIdAsync(payment.Id);

            foreach (var item in affected)
            {
                var sub = item;

                for (var attempt = 0; attempt < 3; attempt++)
                {
                    var entries = sub.Ledger.Where(e => e.PaymentId == payment.Id).ToList();
                    if (entries.Count == 0) break;   // já desfeito por outra execução

                    var expires = sub.ExpiresAt - TimeSpan.FromTicks(entries.Sum(e => e.ExpiresDeltaTicks));
                    var start = sub.StartDate - TimeSpan.FromTicks(entries.Sum(e => e.StartDeltaTicks));

                    // só desativa se nenhum OUTRO pagamento deu tempo de verdade a esta assinatura
                    // (empurrões não contam: não são tempo pago)
                    var created = entries.Any(e => e.Kind == LedgerEntryKind.Created);
                    var paidByOthers = sub.Ledger.Any(e => e.PaymentId != payment.Id && e.Kind != LedgerEntryKind.Shifted);
                    var deactivate = created && !paidByOthers;

                    if (await subscriptionRepository.TryRevertAsync(sub, payment.Id, start, expires, deactivate))
                        break;

                    var fresh = await subscriptionRepository.GetById(sub.Id);
                    if (fresh is null) break;
                    sub = fresh;

                    if (attempt == 2)
                        throw new InvalidOperationException($"Could not revert payment {payment.Id} on subscription {sub.Id}");
                }
            }
        }
    }
}
