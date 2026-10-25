using RpgDex.Domain.Entities;
using RpgDex.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface IPaymentRepository
    {
        Task Insert(Payment payment);
        Task<Payment> GetById(Guid id);
        Task<bool> UpdatePaymentStatus(Guid id, PaymentStatus status);
        Task<Payment> GetByMpOrderId(string orderId);


    }
}
