using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RpgDex.Application.Interfaces;
using RpgDex.WebApi.Extensions;
using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;
using RpgDex.Application.Dto.User;



namespace RpgDex.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UserController : ControllerBase
    {
        private readonly IUserService _userService;
        private string currentUser => User.FindFirst(ClaimTypes.NameIdentifier).Value;
        public UserController(IUserService userService)
        {
            _userService = userService;
        }

        [HttpGet("{Id}")]
        public async Task<IActionResult> GetUserById(Guid Id)
        {
            var result = await _userService.GetUserById(Id);
            return result.ToIActionResult();
        }
        [Authorize(Roles ="Admin")] 
        [HttpGet("admin/chart")]
        public async Task<IActionResult> GetUserChart([FromQuery]DateTime startDate, [FromQuery] DateTime endDate)
        {
            var result = await _userService.GetUserChart(startDate,endDate);
            return result.ToIActionResult();
        }
        [HttpPut]
        public async Task<IActionResult> UpdateUserProfile(UpdateUserProfileDTO updateUserProfileDTO)
        {
            var result = await _userService.UpdateUserProfileAsync(currentUser, updateUserProfileDTO);
            return result.ToIActionResult();
        }

    }
}
