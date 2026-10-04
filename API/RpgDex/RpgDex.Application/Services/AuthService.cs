using FluentValidation;
using Mapster;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Configuration;
using RpgDex.Application.Common;
using RpgDex.Application.Dto;
using RpgDex.Application.Extension;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text;

namespace RpgDex.Application.Services
{
    public class AuthService(UserManager<ApplicationUser> userManager, ITokenService tokenService, IEmailService emailService, IGoogleAuthService googleAuthService, RoleManager<ApplicationRole> rolemanager,
        IConfiguration configuration, IDiscordAuthService discordAuthService, IValidator<CreateUserDTO> createUserValidator, IValidator<AuthUserDTO> authUserValidator) : IAuthService
    {
        private const string GoogleProvider = "Google";
        private const string DiscordProvider = "Discord";

        public async Task<Result<LoginResponse>> LogIn(AuthUserDTO authUser)
        {
            var checkAuthUserValid = authUserValidator.Validate(authUser);
            if (!checkAuthUserValid.IsValid) return checkAuthUserValid.ReturnErrors<LoginResponse>();

            var user = await userManager.FindByEmailAsync(authUser.Email);
            if (user is null) return Result<LoginResponse>.Failure(AuthError.InvalidCredentials);

            var validUser = await userManager.CheckPasswordAsync(user, authUser.Password);
            if (!validUser) return Result<LoginResponse>.Failure(AuthError.InvalidCredentials);

            var IsEmailConfirmed = await userManager.IsEmailConfirmedAsync(user);
            if(!IsEmailConfirmed) return Result<LoginResponse>.Failure(AuthError.EmailNotConfirmed);

            var response = new LoginResponse();

            if (user.TwoFactorEnabled)
            {
               response.TwoFactorEnabled = true;
               response.Email = user.Email;

               return await SendTwoFatorEmail(user,response);
            }

            var accessToken = await tokenService.GenerateTokenAsync(user);

            var newRefreshToken = await GenerateRefreshTokenModelAsync(user);

            response.RefreshToken = newRefreshToken.RefreshToken;
            response.AccessToken = newRefreshToken.AccessToken;

            return Result<LoginResponse>.Success(response);
        }

        public async Task<Result<AuthOptionsResponse>> GetUserAuthOptions(string userId)
        {
            var user = await userManager.FindByIdAsync(userId);
            if(user is null)
            {
                return Result<AuthOptionsResponse>.Failure(AuthError.UserNotFound);
            }
            var hasPassword = await userManager.HasPasswordAsync(user);
            var isTwoFactorEnabled = user.TwoFactorEnabled;

            var logins = await userManager.GetLoginsAsync(user);
            var extrenalProviders = logins.Select(l => l.LoginProvider).ToList();
            var authoptions = new AuthOptionsResponse
            {
                HasPassword = hasPassword,
                ExternalProviders = extrenalProviders,
                IsTwoFactorEnabled = isTwoFactorEnabled,

            };
            return Result<AuthOptionsResponse>.Success(authoptions);
        }
        public async Task<Result<RefreshTokenModel>> ValidateTwoFactor(ValidateTwoFactorRequest request)
        {
            var user = await userManager.FindByEmailAsync(request.Email);
            if(user is null)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.UserNotFound);
            }

            var isTokenValid = await userManager.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultEmailProvider, request.Token);

            if (!isTokenValid)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.InvalidTwoFactorCode);
            }

            return await LogInAsync(user);
        }
        public async Task<Result<string>> RequestTwoFAActivation(ValidateTwoFactorRequest request)
        {
            var user = await userManager.FindByEmailAsync(request.Email);
            if (user is null)
            {
                return Result<string>.Failure(AuthError.UserNotFound);
            }
            var isValid = await userManager.VerifyTwoFactorTokenAsync(user, TokenOptions.DefaultEmailProvider,request.Token);

            if (!isValid)
            {
                return Result<string>.Failure(AuthError.InvalidTwoFactorCode);
            }

            var result = await userManager.SetTwoFactorEnabledAsync(user, true);
            if (!result.Succeeded)
            {
                return Result<string>.Failure(AuthError.TwoFactorActivationFailed);
            }
            return Result<string>.Success("Two Factor Authentication Activated");
        }

        public async Task<Result<string>> SendTwoFactorAuthEmailRequest(SendTwoFactEmailrequest request)
        {
            var user = await userManager.FindByEmailAsync(request.Email);
            if (user is null) return Result<string>.Failure(AuthError.UserNotFound);

            return await SendTwoFatorEmail(user, "Confirmation Code sent to your email");
        }

        public async Task<Result<RefreshTokenModel>> RefreshTokenAsync(RefreshTokenModel tokenModel)
        {
            if (tokenModel is null)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.InvalidToken);
            }
            var token = await tokenService.GetRefreshTokenByToken(tokenModel.RefreshToken);
            if(token is null || token.ExpiryDate <= DateTime.UtcNow)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.ExpiredRefreshToken);
            }

            var principal = tokenService.GetPrincipalFromExpiredToken(tokenModel.AccessToken);
            if(principal is null)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.InvalidToken);
            }

            string userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (token.UserId.ToString() != userId)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.InvalidToken);
            }
            var user = await userManager.FindByIdAsync(userId);
            if (user is null|| tokenModel.RefreshToken != token.Token)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.InvalidToken);
            }

            var tokenRevoked = await tokenService.RevokeTokenByValue(tokenModel.RefreshToken);
            if (!tokenRevoked) { 
                return Result<RefreshTokenModel>.Failure(AuthError.InvalidToken);
            }

            var newTokenModel = await GenerateRefreshTokenModelAsync(user);

            if (newTokenModel is null)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.TokenGenerationFailed);
            }
            return Result<RefreshTokenModel>.Success(newTokenModel);
        }

        public async Task<Result<string>> RegisterUser(CreateUserDTO authUser) {
            var checkUserValid = createUserValidator.Validate(authUser);
            if (!checkUserValid.IsValid) return checkUserValid.ReturnErrors<string>();

            var user = authUser.Adapt<ApplicationUser>();
            user.DisplayName = user.UserName;
            var result = await userManager.CreateAsync(user, authUser.Password);
            if (!result.Succeeded)
            {
                return Result<string>.Failure(AuthError.UserCreationFailed);
            }
            return await SendEmailVerificationAsync(authUser.Email);

        }

        public async Task<Result<string>> ValidateEmailByTokenAsync(ValidateEmailByTokenRequest request)
        {
            var isValid = await tokenService.ValidateEmailToken(request.UserId, request.Token);
            if(isValid)
            {
                return Result<string>.Success("Email verified successfully");
            }
            return Result<string>.Failure(AuthError.InvalidToken);
        }

        public async Task<Result<string>> ResendEmailVerificationAsync(ResendEmailVerificationRequest request)
        {
          return await SendEmailVerificationAsync(request.Email);
        }

        public async Task<Result<RefreshTokenModel>> GoogleSignUp(GoogleLoginRequest request)
        {
            var googleUser = await googleAuthService.ValidateTokenAsync(request.Token);
            if (googleUser is null)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.InvalidToken);
            }
            var userDb = await userManager.FindByEmailAsync(googleUser.email);
            if (userDb is not null) {
                //User Exists, but is the user already linked with Google?
                var userLogins = await userManager.GetLoginsAsync(userDb);

                var googleLoginInfo = userLogins.FirstOrDefault(l => l.LoginProvider == GoogleProvider && l.ProviderKey == googleUser.googleId);
                
                if (googleLoginInfo is null)
                {
                    // User exists but is not linked with Google
                    var userDbLoginInfo = new UserLoginInfo(GoogleProvider, googleUser.googleId, GoogleProvider);
                    var addLoginResult =await userManager.AddLoginAsync(userDb, userDbLoginInfo);
                    if (!addLoginResult.Succeeded)
                    {
                        return Result<RefreshTokenModel>.Failure(AuthError.AccountLinkingFailed);
                    }
                }

                return await LogInAsync(userDb);
            }

            //User does not exist, create a new user and link with Google
            var user = new ApplicationUser
            {
                DisplayName = googleUser.displayName,
                UserName = googleUser.email,
                Email = googleUser.email,
                IconPath = googleUser.iconUrl,
                EmailConfirmed = true
            };
            var createResult = await userManager.CreateAsync(user);
            if (!createResult.Succeeded)
            {
                //var errors = string.Join(" | ", createResult.Errors.Select(e => e.Description));
                //return Result<RefreshTokenModel>.Failure(errors);
                return Result<RefreshTokenModel>.Failure(AuthError.UserCreationFailed);
            }
            var userLoginInfo = new UserLoginInfo(GoogleProvider, googleUser.googleId, GoogleProvider);
            await userManager.AddLoginAsync(user, userLoginInfo);


            return await LogInAsync(user);
        }

        public async Task<Result<RefreshTokenModel>> DiscordSignUp()
        {
            var discorduser = await discordAuthService.GetDiscordUserAsync();
            var userLoginInfo = new UserLoginInfo(DiscordProvider, discorduser.Id, DiscordProvider);
            //Verify if user exists in the database
            var userDb = await userManager.FindByEmailAsync(discorduser.Email);
            if (userDb is not null)
            {
                //User Exists, but is the user already linked with Discord?
                var userLogins = await userManager.GetLoginsAsync(userDb);
                if (!userLogins.Any(x => x.LoginProvider == DiscordProvider))
                {
                    //Account exists but is not linked with Discord, link the account
                    await userManager.AddLoginAsync(userDb, userLoginInfo);
                }
                //User Login with Discord already exists, proceed to login
                return await LogInAsync(userDb);
            }
            //User does not exist, create a new user and link with Discord
            var user = new ApplicationUser
            {
                //Change this later when DisplayName is available
                DisplayName = discorduser.DisplayName,
                UserName = discorduser.UserName,
                Email = discorduser.Email,
                IconPath = discorduser.IconUrl,
                EmailConfirmed = true
            };

            var createdResult =  await userManager.CreateAsync(user);
            if(!createdResult.Succeeded)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.UserCreationFailed);
            }
            await userManager.AddLoginAsync(user, userLoginInfo);



            return await LogInAsync(user);
        }
        private async Task<Result<string>> SendEmailVerificationAsync(string email)
        {
            var user = await userManager.FindByEmailAsync(email);
            if (user is null)
            {
                return Result<string>.Failure(AuthError.UserNotFound);
            }

            var token = await tokenService.GenerateEmailTokenVerificationAsync(user.Id);
            if (token is null)
            {
                return Result<string>.Failure(AuthError.TokenGenerationFailed);
            }
            string verificationLink = $"/emailConfirmation?userid={user.Id}&token={token}";
            var htmlBody = emailService.GenerateEmailVerificationHTMLTemplate(verificationLink, user.UserName);
            var (isEmailSent, message) = await emailService.SendEmailAsync(user.Email, user.UserName, "Email Verification", htmlBody);
            if (!isEmailSent)
            {
                return Result<string>.Failure(AuthError.EmailSendFailed);
            }
            return Result<string>.Success(message);
        }

        private async Task<Result<RefreshTokenModel>> LogInAsync(ApplicationUser user)
        {

            var newRefreshToken = await GenerateRefreshTokenModelAsync(user);
            if (newRefreshToken is null)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.TokenGenerationFailed);
            }
            return Result<RefreshTokenModel>.Success(newRefreshToken);
        }

        private async Task<RefreshTokenModel> GenerateRefreshTokenModelAsync(ApplicationUser user)
        {
            var accessToken = await tokenService.GenerateTokenAsync(user);
            var refreshToken = tokenService.GenerateRefreshToken();
            var newRefreshToken = new RefreshTokenModel
            {
                RefreshToken = refreshToken,
                AccessToken = accessToken,

            };
            var result = await tokenService.StoreRefreshTokenAsync(newRefreshToken.AccessToken, newRefreshToken.RefreshToken, user.Id);

            if (!result)
            {
                return null;
            }

            return newRefreshToken;
        }

        private async Task<Result<T>> SendTwoFatorEmail<T>(ApplicationUser user, T response)
        {
            try
            {
                var twoFactorToken = await userManager.GenerateTwoFactorTokenAsync(user, TokenOptions.DefaultEmailProvider);

                //Generate Email and sendUser
                var htmlTemplate = emailService.GenerateTwoFactorEmailHTMLTemplate(twoFactorToken, user.DisplayName);
                var emailResult = await emailService.SendEmailAsync(user.Email, user.DisplayName, "Two Factor Authentication", htmlTemplate);

                if (!emailResult.isEmailSent)
                {
                    return Result<T>.Failure(AuthError.EmailSendFailed);
                }
                return Result<T>.Success(response);
            }
            catch
            {
                return Result<T>.Failure(AuthError.EmailSendFailed);
            }
        }
    }
}