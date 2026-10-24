using Microsoft.Extensions.Configuration;
using RpgDex.Application.Dto.Payment;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Common;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;

namespace RpgDex.Application.Services
{
    public class PaymentService(IPaymentRepository paymentRepository ,IPlanRepository planRepository, IUserRepository userRepository, IConfiguration configuration, IMercadoPagoOrderClient mpOrderClient) : IPaymentService
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
                    Identification = new MpOrderIdentification
                    {
                        Number = "12345678909"
                    }
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
    }
}
