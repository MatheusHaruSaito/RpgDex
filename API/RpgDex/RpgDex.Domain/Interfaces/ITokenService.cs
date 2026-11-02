using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface ITokenService
    {
        Task<string> GenerateTokenAsync(ApplicationUser authUser);
        string GenerateRefreshToken();
        Task<RefreshToken> GetRefreshTokenByToken(string Token);
        Task<RefreshToken> GetRefreshTokenByUserId(Guid userId);
        Task<bool> StoreRefreshTokenAsync(string accessToken, string refreshToken, Guid userId);
        Task<bool> RevokeTokenByValue(string token);
        Task<bool> RevokeTokenByUserId(Guid userId);
        ClaimsPrincipal? GetPrincipalFromExpiredToken(string? token);
        Task<string>? GenerateEmailTokenVerificationAsync(Guid id);
        Task<bool> ValidateEmailToken(string userId, string token);



    }
}
