using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public class AuthOptionsResponse
    {
        public bool HasPassword { get; set; }
        public List<string> ExternalProviders { get; set; } = new();
        public bool IsTwoFactorEnabled { get; set; }

    }
}
