using AspNet.Security.OAuth.Discord;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Identity;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using RpgDex.Application.Dto;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Entities;
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
        private readonly IAuthService _authSerice;
        private readonly SignInManager<ApplicationUser> _signInManager;
        private readonly ApiSettings _settings;
        private  string currentUser => User.FindFirst(ClaimTypes.NameIdentifier).Value;
        private string[] authRedirectWhitelist = ["/","/perfil"];

        public AuthController(IAuthService authSerice, SignInManager<ApplicationUser> signInManager, IOptions<ApiSettings> settings)
        {
            _authSerice = authSerice;
            _signInManager = signInManager;
            _settings = settings.Value;
        }
        [HttpPost]
        [AllowAnonymous]

        public async Task<IActionResult> Register(CreateUserDTO user)
        {
            var result = await _authSerice.RegisterUser(user);
            return result.ToIActionResult();
        }
        [HttpPost("Login")]
        [AllowAnonymous]
        public async Task<IActionResult> LogIn(AuthUserDTO user)
        {
            var result = await _authSerice.LogIn(user);
            return result.ToIActionResult();

        }
        [HttpPost("RefreshToken")]
        [AllowAnonymous]
        public async Task<IActionResult> RefreshToken(RefreshTokenModel refreshToken)
        {

            var result = await _authSerice.RefreshTokenAsync(refreshToken);
            return result.ToIActionResult();
        }

        [HttpPut("ValidateEmail/")]
        [AllowAnonymous]

        public async Task<IActionResult> ValidateEmailByToken(ValidateEmailByTokenRequest request)
        {
            var result = await _authSerice.ValidateEmailByTokenAsync(request);
            return result.ToIActionResult();
        }

        [HttpPost("ResendEmailVerification")]
        [AllowAnonymous]

        public async Task<IActionResult> ResendEmailVerification(ResendEmailVerificationRequest request)
        {
            var result = await _authSerice.ResendEmailVerificationAsync(request);
            return result.ToIActionResult();
        }
        [HttpPost("Google/SignUp")]
        [AllowAnonymous]

        public async Task<IActionResult> GoogleSingUp(GoogleLoginRequest request)
        {
            var result = await _authSerice.GoogleSignUp(request);
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
            var result = await _authSerice.DiscordSignUp();

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

        [HttpGet("AuthOptions")]
        public async Task<IActionResult> GetUserAuthOptions()
        {
            var result = await _authSerice.GetUserAuthOptions(currentUser);
            return result.ToIActionResult();

        }
        [HttpPost("ValidateTwoFactor")]
        public async Task<IActionResult> ValidateTwoFactor(ValidateTwoFactorRequest request)
        {
            var result = await _authSerice.ValidateTwoFactor(request);
            return result.ToIActionResult();
        }

        [HttpPost("SendTwoFactorAuthEmailRequest")]
        public async Task<IActionResult> SendTwoFactorAuthEmailRequest()
        {
            var result = await _authSerice.SendTwoFactorAuthEmailRequest(currentUser);
            return result.ToIActionResult();
        }

        [HttpPost("ActiveTwoFactorAuth")]
        public async Task<IActionResult> RequestTwoFAActivation(ValidateTwoFactorRequest request)
        {
            var result = await _authSerice.RequestTwoFAActivation(request);
            return result.ToIActionResult();
        }
    }
}
