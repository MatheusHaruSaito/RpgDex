using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Payment
{
    public record MercadoPagoWebhookDto(string Action, string type, MercadoPagoWebHookDataDto? Data);
}
