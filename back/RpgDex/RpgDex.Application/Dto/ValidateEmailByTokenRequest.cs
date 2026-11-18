using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public class ValidateEmailByTokenRequest
    {
        public string UserId { get; set; }
        public string Token { get; set; }
    }
}
