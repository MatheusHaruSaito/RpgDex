using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RpgDex.Application.Interfaces;
using RpgDex.WebApi.Extensions;
using System.Security.Claims;

namespace RpgDex.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class SubscriptionController : ControllerBase
    {
        private readonly ISubscriptionService _subscriptionService;
        private string currentUser => User.FindFirst(ClaimTypes.NameIdentifier)!.Value;

        public SubscriptionController(ISubscriptionService subscriptionService)
        {
            _subscriptionService = subscriptionService;
        }
        [HttpGet("limits")]
        public async Task<IActionResult> ReturnLimits()
        {
          var result = await _subscriptionService.GetSubscritptionLimits(currentUser);
            return result.ToIActionResult();
        }
    }
}
