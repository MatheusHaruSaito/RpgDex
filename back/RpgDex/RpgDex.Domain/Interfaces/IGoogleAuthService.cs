using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface IGoogleAuthService
    {
        Task<GoogleUserInfo> ValidateTokenAsync(string token);
    }
    public record GoogleUserInfo(string googleId, string email, string displayName, string iconUrl);

}
