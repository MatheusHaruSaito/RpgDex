using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.AgeVerification
{
    public record AgeVerificationRequest(DateOnly BirthDate, string Cpf, string? GuardianCpf, string? GuardianEmail);
}
