using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.AgeVerification
{
    public record ConfirmGuardianConsentRequest(string UserId, string Token);
}
