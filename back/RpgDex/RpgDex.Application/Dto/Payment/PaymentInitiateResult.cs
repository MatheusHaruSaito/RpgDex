using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Payment
{
    public record PaymentInitiateResult(Guid PaymentId, string CheckoutUrl);
}
