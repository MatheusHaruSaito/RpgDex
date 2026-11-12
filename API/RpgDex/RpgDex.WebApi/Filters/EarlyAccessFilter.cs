using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;
using RpgDex.Application.Interfaces;
using System.Security.Claims;

namespace RpgDex.WebApi.Filters
{
    public class EarlyAccessFilter(ISubscriptionService subscriptionService) : IAsyncAuthorizationFilter
    {
        public async Task OnAuthorizationAsync(AuthorizationFilterContext context)
        {
            var userId = context.HttpContext.User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (userId is null)
            {
                context.Result = new UnauthorizedResult();
                return;
            }
            var limits = await subscriptionService.GetSubscritptionLimits(userId);
            if (!limits.Value!.HasEarlyAccess)
            {
                context.Result = new ForbidResult();
            }

        }
    }
}
