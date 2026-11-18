using Google.Apis.Auth;
using Microsoft.Extensions.Options;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Settings;
using System;
using System.Collections.Generic;
using System.Text;
using static RpgDex.Domain.Interfaces.IGoogleAuthService;

namespace RpgDex.Infrastructure.Services
{
    public class GoogleAuthService : IGoogleAuthService
    {
        private readonly GoogleAuthSettings _settings;

        public GoogleAuthService(IOptions<GoogleAuthSettings> settings)
        {
            _settings = settings.Value;
        }
        public async Task<GoogleUserInfo> ValidateTokenAsync(string token)
        {
            try
            {
                var validationSettings = new GoogleJsonWebSignature.ValidationSettings()
                {
                    Audience = new[] { _settings.ClientId }
                };
                var payload = await GoogleJsonWebSignature.ValidateAsync(token, validationSettings);
                var displayName = payload.Name ?? payload.Email; 
                payload.Picture = payload.Picture ?? String.Empty;
                return new GoogleUserInfo(payload.Subject, payload.Email, displayName, payload.Picture);
            }
            catch
            {
                return null;
            }
        }
    }
}
