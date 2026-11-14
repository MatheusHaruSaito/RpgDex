using AspNet.Security.OAuth.Discord;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using RpgDex.Application.Dto;
using RpgDex.Application.Dto.AgeVerification;
using RpgDex.Application.Dto.Auth;
using RpgDex.Application.Dto.User;
using RpgDex.Application.Interfaces;
using RpgDex.Application.Services;
using RpgDex.Domain.Entities;
using RpgDex.Infrastructure.Services;
using RpgDex.Infrastructure.Settings;
using RpgDex.WebApi.Extensions;
using System.Security.Claims;
namespace RpgDex.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AuthController : ControllerBase
    {
        private readonly IAuthService _authService;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly ILinkTicketService _linkTicketService;
        private readonly ApiSettings _settings;
        private  string currentUser => User.FindFirst(ClaimTypes.NameIdentifier).Value;
        private string[] authRedirectWhitelist = ["/","/perfil"];

        public AuthController(IAuthService authSerice, SignInManager<ApplicationUser> signInManager, IOptions<ApiSettings> settings, ILinkTicketService linkTicketService)
        {
            _authService = authSerice;
            _signInManager = signInManager;
            _settings = settings.Value;
            _linkTicketService = linkTicketService;
        }
        [HttpPost]
        [AllowAnonymous]

        public async Task<IActionResult> Register(CreateUserDTO user)
        {
            var result = await _authService.RegisterUser(user);
            return result.ToIActionResult();
        }
        [HttpPost("Login")]
        [AllowAnonymous]
        public async Task<IActionResult> LogIn(AuthUserDTO user)
        {
            var result = await _authService.LogIn(user);
            return result.ToIActionResult();

        }
        [HttpPost("RefreshToken")]
        [AllowAnonymous]
        public async Task<IActionResult> RefreshToken(RefreshTokenModel refreshToken)
        {

            var result = await _authService.RefreshTokenAsync(refreshToken);
            return result.ToIActionResult();
        }

        [HttpPut("ValidateEmail/")]
        [AllowAnonymous]

        public async Task<IActionResult> ValidateEmailByToken(ValidateEmailByTokenRequest request)
        {
            var result = await _authService.ValidateEmailByTokenAsync(request);
            return result.ToIActionResult();
        }

        [HttpPost("ResendEmailVerification")]
        [AllowAnonymous]

        public async Task<IActionResult> ResendEmailVerification(ResendEmailVerificationRequest request)
        {
            var result = await _authService.ResendEmailVerificationAsync(request);
            return result.ToIActionResult();
        }
        [HttpPost("Google/SignUp")]
        [AllowAnonymous]

        public async Task<IActionResult> GoogleSingUp(GoogleLoginRequest request)
        {
            var result = await _authService.GoogleSignUp(request);
            return result.ToIActionResult();

        }
        [HttpPost("link/google")]
        public async Task<IActionResult> LinkGoogle([FromBody] GoogleLoginRequest request)
        {
            var result = await _authService.LinkGoogleAccount(currentUser, request);
            return result.ToIActionResult();
        }

        [HttpDelete("unlink/google")]
        public async Task<IActionResult> UnlinkGoogle()
        {
            var result = await _authService.UnlinkGoogleAsync(currentUser);
            return result.ToIActionResult();
        }

        [HttpGet("discord")]
        [AllowAnonymous]
        public IActionResult DiscordLogin([FromQuery] string? redirectUri)
        {
            var redirectUrl = Url.Action(nameof(DiscordSignUp), "Auth", new { customRedirect = redirectUri});


            var properties = _signInManager.ConfigureExternalAuthenticationProperties(
                DiscordAuthenticationDefaults.AuthenticationScheme,
                redirectUrl
            );

            return Challenge(
                properties,
                DiscordAuthenticationDefaults.AuthenticationScheme
            );
        }
        [HttpGet("DiscordSignUp")]
        [AllowAnonymous]

        public async Task<IActionResult> DiscordSignUp([FromQuery] string? customRedirect)
        {
            var result = await _authService.DiscordSignUp();

            if (result.IsFailure)
            {
                return Redirect($"{_settings.UIBaseUrl}/auth/callback?error={result.Errors}");
            }
            var token = result.Value.AccessToken;
            var refreshToken = result.Value.RefreshToken;
            var filteredRedirect = () =>
            {
                if (authRedirectWhitelist.Contains(customRedirect)) return customRedirect;
                return authRedirectWhitelist[0];
            };

            return Redirect($"{_settings.UIBaseUrl}/auth/callback?token={token}&refreshToken={refreshToken}&redirectPage={filteredRedirect()}");
        }
        [Authorize]
        [HttpPost("link/discord/start")]
        public IActionResult StartDiscordLink()
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var ticket = _linkTicketService.Create(userId);

            var url = Url.Action(nameof(DiscordLink), "Auth", new { ticket }, Request.Scheme);
            return Ok(new { success = true, data = new { url } });
        }

        [AllowAnonymous]
        [HttpGet("link/discord")]
        public IActionResult DiscordLink([FromQuery] string ticket)
        {
            var userId = _linkTicketService.Validate(ticket);
            if (userId is null)
                return Redirect($"{_settings.UIBaseUrl}/perfilperfil?error=LINK_TICKET_INVALID");

            var redirectUrl = Url.Action(nameof(DiscordLinkCallback), "Auth");

            var properties = _signInManager.ConfigureExternalAuthenticationProperties(
                DiscordAuthenticationDefaults.AuthenticationScheme,
                redirectUrl);
            properties.Items["linkUserId"] = userId;

            return Challenge(properties, DiscordAuthenticationDefaults.AuthenticationScheme);
        }

        [HttpGet("link/discord/callback")]
        [AllowAnonymous]
        public async Task<IActionResult> DiscordLinkCallback()
        {
            var info = await _signInManager.GetExternalLoginInfoAsync();

            if (info?.AuthenticationProperties is null
                || !info.AuthenticationProperties.Items.TryGetValue("linkUserId", out var userId)
                || string.IsNullOrEmpty(userId))
            {
                return Redirect($"{_settings.UIBaseUrl}/perfil?error=LINK_TICKET_INVALID");
            }

            var result = await _authService.LinkDiscordAccount(userId);

            if (result.IsFailure)
            {
                var error = Uri.EscapeDataString(result.Errors.ToString()!);
                return Redirect($"{_settings.UIBaseUrl}/perfil?error={error}");
            }

            return Redirect($"{_settings.UIBaseUrl}/perfil?linked=discord");
        }
        [HttpDelete("unlink/discord")]
        public async Task<IActionResult> UnlinkDiscord()
        {
            var result = await _authService.UnlinkDiscordAsync(currentUser);
            return result.ToIActionResult();
        }

        [HttpGet("AuthOptions")]
        public async Task<IActionResult> GetUserAuthOptions()
        {
            var result = await _authService.GetUserAuthOptions(currentUser);
            return result.ToIActionResult();

        }
        [HttpPost("ValidateTwoFactor")]
        [AllowAnonymous]
        public async Task<IActionResult> ValidateTwoFactor(ValidateTwoFactorRequest request)
        {
            var result = await _authService.ValidateTwoFactor(request);
            return result.ToIActionResult();
        }

        [HttpPost("SendTwoFactorAuthEmailRequest")]
        [AllowAnonymous]
        public async Task<IActionResult> SendTwoFactorAuthEmailRequest(SendTwoFactEmailrequest request)
        {
            var result = await _authService.SendTwoFactorAuthEmailRequest(request);
            return result.ToIActionResult();
        }

        [HttpPost("ActiveTwoFactorAuth")]
        public async Task<IActionResult> RequestTwoFAActivation(ValidateTwoFactorRequest request)
        {
            var result = await _authService.RequestTwoFAActivation(request);
            return result.ToIActionResult();
        }
        [Authorize]
        [HttpPost("age-verification")]
        public async Task<IActionResult> SubmitAgeVerification([FromBody] AgeVerificationRequest request)
        {
            var result = await _authService.SubmitAgeVerification(currentUser, request);
            return result.ToIActionResult();
        }

        [AllowAnonymous]
        [HttpPost("guardian-consent")]
        public async Task<IActionResult> ConfirmGuardianConsent([FromBody] ConfirmGuardianConsentRequest request) {
            var result = await _authService.ConfirmGuardianConsent(request);
            return result.ToIActionResult();
        }
        [Authorize]
        [HttpPost("resend-guardian-consent")]
        public async Task<IActionResult> ResendGuardianConsent([FromBody] ResendGuardianConsentRequest request)
        {
            var userId = User.FindFirstValue(ClaimTypes.NameIdentifier)!;
            var result = await _authService.ResendGuardianConsentEmail(userId, request);
            return result.ToIActionResult();
        }
        [HttpPost("resetPassword")]
        [AllowAnonymous]
        public async Task<IActionResult> ResetPassword(ResetPasswordRequest request)
        {
            var result = await _authService.ResetPasswordAsync(request);
            return result.ToIActionResult();
        }
        [AllowAnonymous]
        [HttpPost("sendResetPasswordEmail")]
        public async Task<IActionResult> SendResetPasswordEmail(SendResetPasswordEmailRequest request)
        {
            var result = await _authService.SendResetPasswordEmailAsync(request);
            return result.ToIActionResult();
        }
    }
}
