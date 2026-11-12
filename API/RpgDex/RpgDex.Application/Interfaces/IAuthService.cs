using RpgDex.Application.Dto;
using RpgDex.Application.Dto.AgeVerification;
using RpgDex.Application.Dto.Auth;
using RpgDex.Domain.Common;
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
        Task<Result<string>> SendTwoFactorAuthEmailRequest(SendTwoFactEmailrequest request);
        Task<Result<AuthOptionsResponse>> GetUserAuthOptions(string userId);
        Task<Result<RefreshTokenModel>> DiscordSignUp();
        Task<Result<bool>> LinkDiscordAccount(string userId);
        Task<Result<bool>> UnlinkDiscordAsync(string userId);
        Task<Result<RefreshTokenModel>> GoogleSignUp(GoogleLoginRequest request);
        Task<Result<bool>> LinkGoogleAccount(string userId, GoogleLoginRequest request);
        Task<Result<bool>> UnlinkGoogleAsync(string userId);
        Task<Result<RefreshTokenModel>> RefreshTokenAsync(RefreshTokenModel refreshToken);
        Task<Result<string>> ValidateEmailByTokenAsync(ValidateEmailByTokenRequest request);
        Task<Result<string>> ResendEmailVerificationAsync(ResendEmailVerificationRequest request);
        Task<Result<string>> SendResetPasswordEmailAsync(SendResetPasswordEmailRequest request);
        Task<Result<string>> ResetPasswordAsync(ResetPasswordRequest request);
        Task<Result<AgeVerificationResponse>> SubmitAgeVerification(string userId, AgeVerificationRequest request);
        Task<Result<string>> ConfirmGuardianConsent(ConfirmGuardianConsentRequest request);

    }
}
