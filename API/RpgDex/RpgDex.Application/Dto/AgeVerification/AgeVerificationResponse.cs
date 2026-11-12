using RpgDex.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.AgeVerification
{
    public record AgeVerificationResponse(bool IsMinor, GuardianConsentStatus GuardianConsent);
}
