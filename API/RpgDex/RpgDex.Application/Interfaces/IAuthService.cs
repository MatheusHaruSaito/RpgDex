using RpgDex.Domain.Common;
using RpgDex.Application.Dto;
using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface IAuthService
    {
        Task<Result<string>> RegisterUser(CreateUserDTO authUser);
        Task<Result<LoginResponse>> LogIn(AuthUserDTO authUser);
        Task<Result<RefreshTokenModel>> ValidateTwoFactor(ValidateTwoFactorRequest request);
        Task<Result<string>> RequestTwoFAActivation(ValidateTwoFactorRequest request);
        Task<Result<string>> SendTwoFactorAuthEmailRequest(string userId);
        Task<Result<AuthOptionsResponse>> GetUserAuthOptions(string userId);
        Task<Result<RefreshTokenModel>> DiscordSignUp();
        Task<Result<RefreshTokenModel>> GoogleSignUp(GoogleLoginRequest request);
        Task<Result<RefreshTokenModel>> RefreshTokenAsync(RefreshTokenModel refreshToken);
        Task<Result<string>> ValidateEmailByTokenAsync(ValidateEmailByTokenRequest request);
        Task<Result<string>> ResendEmailVerificationAsync(ResendEmailVerificationRequest request);


    }
}
