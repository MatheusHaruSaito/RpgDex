using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public class ValidateTwoFactorRequest
    {
        public string Email { get; set; }
        public string Token { get; set; }
    }
}
