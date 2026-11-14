using FluentValidation;
using Mapster;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.WebUtilities;
using Microsoft.Extensions.Configuration;
using RpgDex.Application.Dto;
using RpgDex.Application.Dto.AgeVerification;
using RpgDex.Application.Dto.Auth;
using RpgDex.Application.Dto.User;
using RpgDex.Application.Extension;
using RpgDex.Application.Helpers;
using RpgDex.Application.Interfaces;
using RpgDex.Application.Validators.AgeVerfication;
using RpgDex.Domain.Common;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Enums;
using RpgDex.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Security.Claims;
using System.Text;

namespace RpgDex.Application.Services
{
    public class AuthService(
        UserManager<ApplicationUser> userManager,
        ITokenService tokenService,
        IEmailService emailService,
        IGoogleAuthService googleAuthService,
        RoleManager<ApplicationRole> rolemanager,
        IConfiguration configuration,
        IDiscordAuthService discordAuthService,
        IFieldHasher fieldHasher,
        IUserRepository userRepository,
        IValidator<CreateUserDTO> createUserValidator,
        IValidator<AuthUserDTO> authUserValidator,
        IValidator<AgeVerificationRequest> ageVerificationValidator) : IAuthService
    {
        private const string GoogleProvider = "Google";
        private const string DiscordProvider = "Discord";
        private const string GuardianConsentPurpose = "GuardianConsent";
        private static readonly TimeSpan GuardianResendCooldown = TimeSpan.FromMinutes(1);

        public async Task<Result<LoginResponse>> LogIn(AuthUserDTO authUser)
        {
            var checkAuthUserValid = authUserValidator.Validate(authUser);
            if (!checkAuthUserValid.IsValid) return checkAuthUserValid.ReturnErrors<LoginResponse>();

            var user = await userManager.FindByEmailAsync(authUser.Email);
            if (user is null) return Result<LoginResponse>.Failure(AuthError.InvalidCredentials);

            var validUser = await userManager.CheckPasswordAsync(user, authUser.Password);
            if (!validUser) return Result<LoginResponse>.Failure(AuthError.InvalidCredentials);

            if (await userManager.IsLockedOutAsync(user))
            {
                return Result<LoginResponse>.Failure(UserError.UserIsBanned);
            }

            var isEmailConfirmed = await userManager.IsEmailConfirmedAsync(user);
            if (!isEmailConfirmed) return Result<LoginResponse>.Failure(AuthError.EmailNotConfirmed);

            var result = await AddUserRoleToUser(user);
            if (!result)
            {
                return Result<LoginResponse>.Failure(AuthError.InvalidCredentials);
            }

            var response = new LoginResponse();

            if (user.TwoFactorEnabled)
            {
                response.TwoFactorEnabled = true;
                response.Email = user.Email;

                return await SendTwoFatorEmail(user, response);
            }

            var newRefreshToken = await GenerateRefreshTokenModelAsync(user);
            if (newRefreshToken is null)
            {
                return Result<LoginResponse>.Failure(AuthError.TokenGenerationFailed);
            }

            response.RefreshToken = newRefreshToken.RefreshToken;
            response.AccessToken = newRefreshToken.AccessToken;

            return Result<LoginResponse>.Success(response);
        }

        public async Task<Result<AuthOptionsResponse>> GetUserAuthOptions(string userId)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is null)
            {
                return Result<AuthOptionsResponse>.Failure(AuthError.UserNotFound);
            }

            var hasPassword = await userManager.HasPasswordAsync(user);
            var isTwoFactorEnabled = user.TwoFactorEnabled;

            var logins = await userManager.GetLoginsAsync(user);
            var externalProviders = logins.Select(l => l.LoginProvider).ToList();

            var authOptions = new AuthOptionsResponse
            {
                HasPassword = hasPassword,
                ExternalProviders = externalProviders,
                IsTwoFactorEnabled = isTwoFactorEnabled,
            };

            return Result<AuthOptionsResponse>.Success(authOptions);
        }

        public async Task<Result<RefreshTokenModel>> ValidateTwoFactor(ValidateTwoFactorRequest request)
        {
            var user = await userManager.FindByEmailAsync(request.Email);
            if (user is null)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.UserNotFound);
            }

            var isTokenValid = await userManager.VerifyTwoFactorTokenAsync(
                user, TokenOptions.DefaultEmailProvider, request.Token);

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

            var isValid = await userManager.VerifyTwoFactorTokenAsync(
                user, TokenOptions.DefaultEmailProvider, request.Token);

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
            if (token is null || token.ExpiryDate <= DateTime.UtcNow)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.ExpiredRefreshToken);
            }

            var principal = tokenService.GetPrincipalFromExpiredToken(tokenModel.AccessToken);
            if (principal is null)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.InvalidToken);
            }

            string userId = principal.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (token.UserId.ToString() != userId)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.InvalidToken);
            }

            var user = await userManager.FindByIdAsync(userId);
            if (user is null || tokenModel.RefreshToken != token.Token)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.InvalidToken);
            }

            var tokenRevoked = await tokenService.RevokeTokenByValue(tokenModel.RefreshToken);
            if (!tokenRevoked)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.InvalidToken);
            }

            var newTokenModel = await GenerateRefreshTokenModelAsync(user);
            if (newTokenModel is null)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.TokenGenerationFailed);
            }

            return Result<RefreshTokenModel>.Success(newTokenModel);
        }

        public async Task<Result<string>> RegisterUser(CreateUserDTO authUser)
        {
            var checkUserValid = createUserValidator.Validate(authUser);
            if (!checkUserValid.IsValid) return checkUserValid.ReturnErrors<string>();

            var user = authUser.Adapt<ApplicationUser>();
            user.DisplayName = user.UserName;

            var result = await userManager.CreateAsync(user, authUser.Password);
            if (!result.Succeeded)
            {
                return Result<string>.Failure(AuthError.UserCreationFailed);
            }

            var roleResult = await userManager.AddToRoleAsync(user, "User");
            if (!roleResult.Succeeded)
            {
                return Result<string>.Failure(AuthError.UserCreationFailed);
            }

            return await SendEmailVerificationAsync(authUser.Email);
        }

        public async Task<Result<string>> ValidateEmailByTokenAsync(ValidateEmailByTokenRequest request)
        {
            var isValid = await tokenService.ValidateEmailToken(request.UserId, request.Token);
            if (isValid)
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

            if (userDb is not null)
            {
                if (await userManager.IsLockedOutAsync(userDb))
                {
                    return Result<RefreshTokenModel>.Failure(UserError.UserIsBanned);
                }

                var userLogins = await userManager.GetLoginsAsync(userDb);
                var googleLoginInfo = userLogins.FirstOrDefault(
                    l => l.LoginProvider == GoogleProvider && l.ProviderKey == googleUser.googleId);

                if (googleLoginInfo is null)
                {
                    var userDbLoginInfo = new UserLoginInfo(GoogleProvider, googleUser.googleId, GoogleProvider);
                    var addLoginResult = await userManager.AddLoginAsync(userDb, userDbLoginInfo);
                    if (!addLoginResult.Succeeded)
                    {
                        return Result<RefreshTokenModel>.Failure(AuthError.AccountLinkingFailed);
                    }
                }

                return await LogInAsync(userDb);
            }

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
                return Result<RefreshTokenModel>.Failure(AuthError.UserCreationFailed);
            }

            var roleResult = await userManager.AddToRoleAsync(user, "User");
            if (!roleResult.Succeeded)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.UserCreationFailed);
            }

            var userLoginInfo = new UserLoginInfo(GoogleProvider, googleUser.googleId, GoogleProvider);
            await userManager.AddLoginAsync(user, userLoginInfo);

            return await LogInAsync(user);
        }

        public async Task<Result<bool>> LinkGoogleAccount(string userId, GoogleLoginRequest request)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is null)
            {
                return Result<bool>.Failure(AuthError.UserNotFound);
            }

            var googleUser = await googleAuthService.ValidateTokenAsync(request.Token);
            if (googleUser is null)
                return Result<bool>.Failure(AuthError.InvalidToken);

            var owner = await userManager.FindByLoginAsync(GoogleProvider, googleUser.googleId);
            if (owner is not null)
            {
                return Result<bool>.Failure(AuthError.AccountAlreadyLinked);
            }

            var logins = await userManager.GetLoginsAsync(user);
            if (logins.Any(l => l.LoginProvider == GoogleProvider))
                return Result<bool>.Failure(AuthError.UserAlreadyHasGoogle);

            var info = new UserLoginInfo(GoogleProvider, googleUser.googleId, GoogleProvider);
            var result = await userManager.AddLoginAsync(user, info);

            return result.Succeeded
                ? Result<bool>.Success(true)
                : Result<bool>.Failure(AuthError.AccountLinkingFailed);
        }

        public async Task<Result<bool>> UnlinkGoogleAsync(string userId)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is null) return Result<bool>.Failure(AuthError.UserNotFound);

            var logins = await userManager.GetLoginsAsync(user);
            var google = logins.FirstOrDefault(l => l.LoginProvider == GoogleProvider);
            if (google is null) return Result<bool>.Failure(AuthError.GoogleNotLinked);

            var hasPassword = await userManager.HasPasswordAsync(user);
            if (!hasPassword && logins.Count <= 1)
                return Result<bool>.Failure(AuthError.CannotRemoveLastLogin);

            var result = await userManager.RemoveLoginAsync(user, google.LoginProvider, google.ProviderKey);
            return result.Succeeded
                ? Result<bool>.Success(true)
                : Result<bool>.Failure(AuthError.AccountLinkingFailed);
        }

        public async Task<Result<RefreshTokenModel>> DiscordSignUp()
        {
            var discordUser = await discordAuthService.GetDiscordUserAsync();
            var userLoginInfo = new UserLoginInfo(DiscordProvider, discordUser.Id, DiscordProvider);

            var userByDiscord = await userManager.FindByLoginAsync(DiscordProvider, discordUser.Id);
            if (userByDiscord is not null)
            {
                return await LogInAsync(userByDiscord);
            }

            var userDb = await userManager.FindByEmailAsync(discordUser.Email);
            if (userDb is not null)
            {
                if (await userManager.IsLockedOutAsync(userDb))
                {
                    return Result<RefreshTokenModel>.Failure(UserError.UserIsBanned);
                }

                var userLogins = await userManager.GetLoginsAsync(userDb);
                if (!userLogins.Any(x => x.LoginProvider == DiscordProvider))
                {
                    await userManager.AddLoginAsync(userDb, userLoginInfo);
                }

                return await LogInAsync(userDb);
            }

            var user = new ApplicationUser
            {
                DisplayName = discordUser.DisplayName,
                UserName = discordUser.UserName,
                Email = discordUser.Email,
                IconPath = discordUser.IconUrl,
                EmailConfirmed = true
            };

            var createdResult = await userManager.CreateAsync(user);
            if (!createdResult.Succeeded)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.UserCreationFailed);
            }

            var addLogin = await userManager.AddLoginAsync(user, userLoginInfo);
            if (!addLogin.Succeeded)
            {
                await userManager.DeleteAsync(user);
                return Result<RefreshTokenModel>.Failure(AuthError.ExternalLoginFailed);
            }

            var roleResult = await userManager.AddToRoleAsync(user, "User");
            if (!roleResult.Succeeded)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.UserCreationFailed);
            }

            return await LogInAsync(user);
        }

        public async Task<Result<bool>> LinkDiscordAccount(string userId)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is null) return Result<bool>.Failure(AuthError.UserNotFound);

            var discordUser = await discordAuthService.GetDiscordUserAsync();

            var owner = await userManager.FindByLoginAsync(DiscordProvider, discordUser.Id);
            if (owner is not null)
                return owner.Id == user.Id
                    ? Result<bool>.Failure(AuthError.AccountAlreadyLinked)
                    : Result<bool>.Failure(AuthError.DiscordLinkedToAnotherUser);

            var logins = await userManager.GetLoginsAsync(user);
            if (logins.Any(l => l.LoginProvider == DiscordProvider))
                return Result<bool>.Failure(AuthError.UserAlreadyHasDiscord);

            var result = await userManager.AddLoginAsync(
                user, new UserLoginInfo(DiscordProvider, discordUser.Id, DiscordProvider));

            return result.Succeeded
                ? Result<bool>.Success(true)
                : Result<bool>.Failure(AuthError.AccountLinkingFailed);
        }

        public async Task<Result<bool>> UnlinkDiscordAsync(string userId)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is null) return Result<bool>.Failure(AuthError.UserNotFound);

            var logins = await userManager.GetLoginsAsync(user);
            var discord = logins.FirstOrDefault(l => l.LoginProvider == DiscordProvider);
            if (discord is null) return Result<bool>.Failure(AuthError.DiscordNotLinked);

            var hasPassword = await userManager.HasPasswordAsync(user);
            if (!hasPassword && logins.Count <= 1)
                return Result<bool>.Failure(AuthError.CannotRemoveLastLogin);

            var result = await userManager.RemoveLoginAsync(user, discord.LoginProvider, discord.ProviderKey);
            return result.Succeeded
                ? Result<bool>.Success(true)
                : Result<bool>.Failure(AuthError.AccountLinkingFailed);
        }

        public async Task<Result<string>> SendResetPasswordEmailAsync(SendResetPasswordEmailRequest request)
        {
            var user = await userManager.FindByEmailAsync(request.Email);
            if (user is null)
            {
                return Result<string>.Failure(AuthError.UserNotFound);
            }

            var isEmailConfirmed = await userManager.IsEmailConfirmedAsync(user);
            if (!isEmailConfirmed)
            {
                return Result<string>.Failure(AuthError.EmailNotConfirmed);
            }

            var token = await userManager.GeneratePasswordResetTokenAsync(user);
            if (token is null)
            {
                return Result<string>.Failure(AuthError.TokenGenerationFailed);
            }

            var encodedToken = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));
            string resetLink = $"/resetPassword?email={user.Email}&token={encodedToken}";
            var htmlBody = emailService.GeneratePasswordResetHTMLTemplate(resetLink, user.UserName!);
            var (isEmailSent, message) = await emailService.SendEmailAsync(user.Email!, user.UserName!, "Password Reset", htmlBody);

            if (!isEmailSent)
            {
                return Result<string>.Failure(AuthError.EmailSendFailed);
            }

            return Result<string>.Success(message);
        }

        public async Task<Result<string>> ResetPasswordAsync(ResetPasswordRequest request)
        {
            var user = await userManager.FindByEmailAsync(request.Email);
            if (user is null)
            {
                return Result<string>.Failure(AuthError.UserNotFound);
            }

            string decodedToken;
            try
            {
                decodedToken = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(request.Token));
            }
            catch (FormatException)
            {
                return Result<string>.Failure(AuthError.PasswordResetFailed);
            }

            var result = await userManager.ResetPasswordAsync(user, decodedToken, request.NewPassword);
            if (!result.Succeeded)
            {
                return Result<string>.Failure(AuthError.PasswordResetFailed);
            }

            var revoked = await tokenService.RevokeTokenByUserId(user.Id);
            if (!revoked)
            {
                return Result<string>.Failure(AuthError.TokenGenerationFailed);
            }

            var htmlBody = emailService.GeneratePasswordResetConfirmationHTMLTemplate(user.UserName!);
            var (isEmailSent, message) = await emailService.SendEmailAsync(user.Email!, user.UserName!, "Password Reset Confirmation", htmlBody);

            if (!isEmailSent)
            {
                return Result<string>.Failure(AuthError.EmailSendFailed);
            }

            return Result<string>.Success("Password reset successfully.");
        }

        public async Task<Result<AgeVerificationResponse>> SubmitAgeVerification(string userId, AgeVerificationRequest request)
        {
            var check = ageVerificationValidator.Validate(request);
            if (!check.IsValid) return check.ReturnErrors<AgeVerificationResponse>();

            var user = await userManager.FindByIdAsync(userId);
            if (user is null) return Result<AgeVerificationResponse>.Failure(AuthError.UserNotFound);

            if (user.AgeVerifiedAt is not null)
                return Result<AgeVerificationResponse>.Failure(AgeVerificationError.AlreadyVerified);

            var cpf = CpfValidator.Normalize(request.Cpf);
            var cpfHash = fieldHasher.Hash(cpf);

            var cpfInUse = await userRepository.ExistsByCpfHashAsync(cpfHash, user.Id);
            if (cpfInUse) return Result<AgeVerificationResponse>.Failure(AgeVerificationError.CpfAlreadyInUse);

            var isMinor = AgeVerificationRequestValidator.IsMinor(request.BirthDate);

            if (isMinor && string.Equals(request.GuardianEmail?.Trim(), user.Email, StringComparison.OrdinalIgnoreCase))
                return Result<AgeVerificationResponse>.Failure(AgeVerificationError.GuardianEmailSameAsUser);

            user.BirthDate = request.BirthDate;
            user.Cpf = cpf;
            user.CpfHash = cpfHash;

            if (!isMinor)
            {
                user.GuardianCpf = null;
                user.GuardianEmail = null;
                user.GuardianConsent = GuardianConsentStatus.NotRequired;
                user.AgeVerifiedAt = DateTime.UtcNow;
            }
            else
            {
                user.GuardianCpf = CpfValidator.Normalize(request.GuardianCpf);
                user.GuardianEmail = request.GuardianEmail!.Trim().ToLowerInvariant();
                user.GuardianConsent = GuardianConsentStatus.Pending;
                user.GuardianEmailSentAt = DateTime.UtcNow;
            }

            var update = await userManager.UpdateAsync(user);
            if (!update.Succeeded)
                return Result<AgeVerificationResponse>.Failure(AgeVerificationError.SaveFailed);

            if (isMinor)
            {
                var sent = await SendGuardianConsentEmailAsync(user);
                if (!sent) return Result<AgeVerificationResponse>.Failure(AgeVerificationError.GuardianEmailSendFailed);
            }

            return Result<AgeVerificationResponse>.Success(new(isMinor, user.GuardianConsent));
        }

        public async Task<Result<RefreshTokenModel>> ConfirmGuardianConsent(ConfirmGuardianConsentRequest request)
        {
            var user = await userManager.FindByIdAsync(request.UserId);
            if (user is null) return Result<string>.Failure(AuthError.UserNotFound);

            if (user.GuardianConsent != GuardianConsentStatus.Pending)
                return Result<RefreshTokenModel>.Failure(AgeVerificationError.InvalidConsentToken);
            string decoded;
            try
            {
                decoded = Encoding.UTF8.GetString(WebEncoders.Base64UrlDecode(request.Token));
            }
            catch (FormatException)
            {
                return Result<RefreshTokenModel>.Failure(AgeVerificationError.InvalidConsentToken);
            }

            var valid = await userManager.VerifyUserTokenAsync(
                user, TokenOptions.DefaultProvider, GuardianConsentPurpose, decoded);
            if (!valid) return Result<RefreshTokenModel>.Failure(AgeVerificationError.InvalidConsentToken);

            user.GuardianConsent = GuardianConsentStatus.Approved;
            user.AgeVerifiedAt = DateTime.UtcNow;
            var result = await userManager.UpdateAsync(user);

            return result.Succeeded
                ? await LogInAsync(user)
                : Result<RefreshTokenModel>.Failure(AgeVerificationError.SaveFailed);
        }

        public async Task<Result<string>> ResendGuardianConsentEmail(string userId, ResendGuardianConsentRequest request)
        {
            var user = await userManager.FindByIdAsync(userId);
            if (user is null) return Result<string>.Failure(AuthError.UserNotFound);

            if (user.GuardianConsent != GuardianConsentStatus.Pending)
                return Result<string>.Failure(AgeVerificationError.NoPendingConsent);

            var isChangingEmail = !string.IsNullOrWhiteSpace(request.GuardianEmail);

            if (!isChangingEmail &&
                user.GuardianEmailSentAt is { } lastSent &&
                DateTime.UtcNow - lastSent < GuardianResendCooldown)
                return Result<string>.Failure(AgeVerificationError.ResendTooSoon);

            if (isChangingEmail)
            {
                var newEmail = request.GuardianEmail!.Trim().ToLowerInvariant();

                if (newEmail.Length > 255 || !System.Net.Mail.MailAddress.TryCreate(newEmail, out _))
                    return Result<string>.Failure(AgeVerificationError.InvalidGuardianEmail);

                if (string.Equals(newEmail, user.Email, StringComparison.OrdinalIgnoreCase))
                    return Result<string>.Failure(AgeVerificationError.GuardianEmailSameAsUser);

                user.GuardianEmail = newEmail;
            }

            var sent = await SendGuardianConsentEmailAsync(user);
            if (!sent) return Result<string>.Failure(AgeVerificationError.GuardianEmailSendFailed);

            user.GuardianEmailSentAt = DateTime.UtcNow;
            var update = await userManager.UpdateAsync(user);

            return update.Succeeded
                ? Result<string>.Success("Guardian consent email sent")
                : Result<string>.Failure(AgeVerificationError.SaveFailed);
        }

        private async Task<bool> SendGuardianConsentEmailAsync(ApplicationUser user)
        {
            var token = await userManager.GenerateUserTokenAsync(
                user, TokenOptions.DefaultProvider, GuardianConsentPurpose);
            var encoded = WebEncoders.Base64UrlEncode(Encoding.UTF8.GetBytes(token));

            var link = $"/guardianConsent?userId={user.Id}&token={encoded}";
            var html = emailService.GenerateGuardianConsentHTMLTemplate(link, user.DisplayName!);
            var (sent, _) = await emailService.SendEmailAsync(
                user.GuardianEmail!, "Responsável Legal", "Autorização de Responsável — RPGDex", html);
            return sent;
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
            var (isEmailSent, message) = await emailService.SendEmailAsync(
                user.Email, user.UserName, "Email Verification", htmlBody);

            if (!isEmailSent)
            {
                return Result<string>.Failure(AuthError.EmailSendFailed);
            }

            return Result<string>.Success(message);
        }

        private async Task<Result<RefreshTokenModel>> LogInAsync(ApplicationUser user)
        {
            var result = await AddUserRoleToUser(user);
            if (!result)
            {
                return Result<RefreshTokenModel>.Failure(AuthError.InvalidCredentials);
            }

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

            var result = await tokenService.StoreRefreshTokenAsync(
                newRefreshToken.AccessToken, newRefreshToken.RefreshToken, user.Id);

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
                var twoFactorToken = await userManager.GenerateTwoFactorTokenAsync(
                    user, TokenOptions.DefaultEmailProvider);

                var htmlTemplate = emailService.GenerateTwoFactorEmailHTMLTemplate(twoFactorToken, user.DisplayName);
                var emailResult = await emailService.SendEmailAsync(
                    user.Email, user.DisplayName, "Two Factor Authentication", htmlTemplate);

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

        private async Task<bool> AddUserRoleToUser(ApplicationUser user)
        {
            var roles = await userManager.GetRolesAsync(user);
            if (!roles.Any())
            {
                var result = await userManager.AddToRoleAsync(user, "User");
                return result.Succeeded;
            }   
            return true;
        }
    }
}