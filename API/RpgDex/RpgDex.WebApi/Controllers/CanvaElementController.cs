using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RpgDex.Application.Dto;
using RpgDex.Application.Dto.Canvas;
using RpgDex.Application.Interfaces;
using RpgDex.WebApi.Extensions;
using System.Security.Claims;

namespace RpgDex.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CanvaElementController : ControllerBase
    {
        private string currentUser => User.FindFirst(ClaimTypes.NameIdentifier).Value;
        private readonly ICanvaElementService _canvaElementService;

        public CanvaElementController(ICanvaElementService canvaElementService)
        {
            _canvaElementService = canvaElementService;
        }
        [HttpPost]
        public async Task<IActionResult> CreateElement([FromForm] CreateCanvaElementRequest request)
        {
            var result = await _canvaElementService.CreateElement(currentUser, request);
            return result.ToIActionResult();
        }
        [HttpGet("All")]
        public async Task<IActionResult> GetAllElements([FromQuery]Guid campaignId, [FromQuery]int page, [FromQuery]int pageSize)
        {
            var result = await _canvaElementService.GetAllElements(currentUser, campaignId,page,pageSize);
            return result.ToIActionResult();
        }
        [HttpPut]
        public async Task<IActionResult> UpdateElement([FromForm] UpdateCanvasElementRequest request)
        {
            var result = await _canvaElementService.UpdateElement(currentUser, request);
            return result.ToIActionResult();
        }
        [HttpPatch("MoveElement")]
        public async Task<IActionResult> MoveElement([FromBody] MoveCanvaElementsRequest request)
        {
            var result = await _canvaElementService.MoveElement(currentUser, request);
            return result.ToIActionResult();
        }
        [HttpPatch("ReOrderElement")]
        public async Task<IActionResult> ReOrderElement([FromBody] ReOrderCanvaElementsRequest request)
        {
            var result = await _canvaElementService.ReOrderElement(currentUser, request);
            return result.ToIActionResult();
        }
        [HttpPatch("Deactive")]
        public async Task<IActionResult> Deactive([FromBody] SetElementActiveStateRequest request)
        {
            var result = await _canvaElementService.SetElementActiveState(currentUser, request,false);
            return result.ToIActionResult();
        }
    }
}
