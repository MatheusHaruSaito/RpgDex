using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Auth
{
    public record ResetPasswordRequest(string Token, string NewPassword, string Email);
}
