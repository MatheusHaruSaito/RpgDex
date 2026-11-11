using AspNetCore.Identity.MongoDbCore.Models;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using MongoDB.Driver.Linq;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Settings;
using System;
using System.Collections.Generic;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
namespace RpgDex.Infrastructure.Services
{
    public class TokenService : ITokenService
    {
        private readonly JwtSettings _settings;
        private readonly UserManager<ApplicationUser> _userManager;
        private readonly ITokenRepository _tokenRepository;
        public TokenService(IOptions<JwtSettings> settings, UserManager<ApplicationUser> userManager, ITokenRepository tokenRepository)
        {
            _settings = settings.Value;
            _userManager = userManager;
            _tokenRepository = tokenRepository;
        }
        public async Task<string> GenerateTokenAsync(ApplicationUser authUser)
        {
            var claims = new List<Claim>
            {
                new Claim(JwtRegisteredClaimNames.Sub, authUser.Id.ToString()),
                new Claim(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
            };

            var userRoles = await _userManager.GetRolesAsync(authUser);
            foreach (var role in userRoles)
            {
                claims.Add( new Claim(ClaimTypes.Role, role));
            }
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Key));
            var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);
            var tokenConfig = new JwtSecurityToken(
                issuer: _settings.Issuer,
                audience: _settings.Audience,
                claims: claims,
                expires: DateTime.UtcNow.AddMinutes(_settings.TokenValidityInMinutes),
                signingCredentials: credentials
                
                );
           return new JwtSecurityTokenHandler().WriteToken(tokenConfig);
        }

        public async Task<RefreshToken> GetRefreshTokenByToken(string Token) 
        { 
            return await _tokenRepository.GetRefreshTokenByTokenAsync(Token);
        }
        public async Task<RefreshToken> GetRefreshTokenByUserId(Guid userId)
        {
            var user = await _userManager.FindByIdAsync(userId.ToString());
            if(user is null)
            {
                return null;
            }
            return await _tokenRepository.GetRefreshTokenByUserIdAsync(userId);
        }
        public async Task<bool> StoreRefreshTokenAsync(string accessToken, string refreshToken, Guid userId)
        {
            var newRefreshToken = new RefreshToken
            {
                Token = refreshToken,
                ExpiryDate = DateTime.UtcNow.AddMinutes(_settings.RefreshTokenValidityInMinutes),
                UserId = userId
            };
            var token = await _tokenRepository.StoreTokenAsync(newRefreshToken);

            return token is not null;
        }
        public string GenerateRefreshToken()
        {
            var randomNumber = new Byte[64];
            var rng = RandomNumberGenerator.Create();
            rng.GetBytes(randomNumber);
            return Convert.ToBase64String(randomNumber);
        }

        public Task<bool> RevokeTokenByValue(string token)
        {
            return _tokenRepository.DeleteTokenByValueAsync(token);
        }
        public ClaimsPrincipal? GetPrincipalFromExpiredToken(string? token)
        {
            var TokenValidationParameters = new TokenValidationParameters
            {
                ValidateIssuer = true,
                ValidateAudience = true,
                ValidIssuer = _settings.Issuer,
                ValidAudience = _settings.Audience,
                ValidateIssuerSigningKey = true,
                ValidateLifetime = false,
                IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_settings.Key)),
            };
            var tokenHandler = new JwtSecurityTokenHandler();

            var principal = tokenHandler.ValidateToken(token, TokenValidationParameters, out SecurityToken securityToken);

            if (securityToken is not JwtSecurityToken jwtSecurityToken ||
                !jwtSecurityToken.Header.Alg.Equals(SecurityAlgorithms.HmacSha256,
                    StringComparison.InvariantCultureIgnoreCase))
                throw new SecurityTokenException("Invalid Token");

            return principal;
        }

        public async Task<string>? GenerateEmailTokenVerificationAsync(Guid id)
        {
            var user = await _userManager.FindByIdAsync(id.ToString());
            if (user is null)
            {
                return null;
            }
            var result = await _userManager.GenerateEmailConfirmationTokenAsync(user);
            var resultBytes = Encoding.UTF8.GetBytes(result);
            var token  = WebEncoders.Base64UrlEncode(resultBytes);

            return token;
        }
        public async Task<bool> ValidateEmailToken(string userId,string token)
        {
            var user = await _userManager.FindByIdAsync(userId);
            if (user is null)
            {
                return false;
            }

            var decodedTokenBytes = WebEncoders.Base64UrlDecode(token);
            var originalToken = Encoding.UTF8.GetString(decodedTokenBytes);

            var result = await _userManager.ConfirmEmailAsync(user, originalToken);
            return result.Succeeded;
        }

        public async Task<bool> RevokeTokenByUserId(Guid userId)
        {
            return await _tokenRepository.DeleteTokenByUserIdAsync(userId);
        }
    }
}
