using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public class LoginResponse
    {
        public string? AccessToken { get; set; }
        public string? RefreshToken { get; set; }
        public bool TwoFactorEnabled { get; set; } = false;
        public string? Email { get; set; }

    }
}
