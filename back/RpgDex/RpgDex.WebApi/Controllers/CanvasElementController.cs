using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RpgDex.Application.Dto.Canvas;
using RpgDex.Application.Interfaces;
using RpgDex.WebApi.Extensions;
using System.Security.Claims;

namespace RpgDex.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize(Policy = "AgeVerified")]
    public class CanvasElementController : ControllerBase
    {
        private string currentUser => User.FindFirst(ClaimTypes.NameIdentifier).Value;
        private readonly ICanvasElementService _canvasElementService;

        public CanvasElementController(ICanvasElementService canvasElementService)
        {
            _canvasElementService = canvasElementService;
        }
        [HttpPost("element")]   
        public async Task<IActionResult> CreateElement([FromBody] CreateCanvaElementRequest request, [FromHeader(Name = "Except-Connection-Id")] string? exceptConnectionId = null)
        {
            var result = await _canvasElementService.CreateElement(currentUser, request with { ExceptConnectionId = exceptConnectionId });
            return result.ToIActionResult();
        }
        [HttpPost("element/image")]
        public async Task<IActionResult> CreateImageElement([FromForm] CreateCanvaElementRequest request, [FromHeader(Name = "Except-Connection-Id")] string? exceptConnectionId = null)
        {
            var result = await _canvasElementService.CreateElement(currentUser, request with { ExceptConnectionId = exceptConnectionId });
            return result.ToIActionResult();
        }
        [HttpPost("element/token")]
        public async Task<IActionResult> CreateTokenElement([FromBody] CreateCanvaTokenElementRequest request, [FromHeader(Name = "Except-Connection-Id")] string? exceptConnectionId = null)
        {
            var result = await _canvasElementService.CreateTokenElement(currentUser, request with { ExceptConnectionId = exceptConnectionId });
            return result.ToIActionResult();
        }
        [HttpPost("element/token/quick")]
        public async Task<IActionResult> QuickCreateCharacterTokenElement([FromForm] QuickCreateCanvaTokenElementRequest request, [FromHeader(Name = "Except-Connection-Id")] string? exceptConnectionId = null)
        {
            var result = await _canvasElementService.QuickCreateTokenElement(currentUser, request with { ExceptConnectionId = exceptConnectionId });
            return result.ToIActionResult();
        }

        [HttpGet("All")]
        public async Task<IActionResult> GetAllElements([FromQuery]Guid campaignId, [FromQuery]double? minX, [FromQuery]double? minY, [FromQuery]double? maxX, [FromQuery]double? maxY)
        {
            var result = await _canvasElementService.GetAllElements(currentUser, campaignId, minX, minY, maxX, maxY);
            return result.ToIActionResult();
        }
        [HttpPut("element")]
        public async Task<IActionResult> UpdateElement([FromBody] UpdateCanvasElementRequest request)
        {
            var result = await _canvasElementService.UpdateElement(currentUser, request);
            return result.ToIActionResult();
        }
        [HttpPut("element/image")]
        public async Task<IActionResult> UpdateImageElement([FromForm] UpdateCanvasElementRequest request)
        {
            var result = await _canvasElementService.UpdateElement(currentUser, request);
            return result.ToIActionResult();
        }
        [HttpPatch("MoveElement")]
        public async Task<IActionResult> MoveElement([FromBody] MoveCanvasElementsRequest request, [FromHeader(Name = "Except-Connection-Id")] string? exceptConnectionId = null)
        {
            var result = await _canvasElementService.MoveElement(currentUser, request with { ExceptConnectionId = exceptConnectionId });
            return result.ToIActionResult();
        }
        [HttpPatch("ReOrderElement")]
        public async Task<IActionResult> ReOrderElement([FromBody] ReOrderCanvasElementsRequest request, [FromHeader(Name = "Except-Connection-Id")] string? exceptConnectionId = null)
        {
            var result = await _canvasElementService.ReOrderElement(currentUser, request with { ExceptConnectionId = exceptConnectionId });
            return result.ToIActionResult();
        }
        [HttpPatch("Deactive")]
        public async Task<IActionResult> Deactive([FromBody] SetElementActiveStateRequest request, [FromHeader(Name = "Except-Connection-Id")] string? exceptConnectionId = null)
        {
            var result = await _canvasElementService.SetElementActiveState(currentUser, request with { ExceptConnectionId = exceptConnectionId }, false);
            return result.ToIActionResult();
        }
        [HttpPatch("Active")]
        public async Task<IActionResult> Active([FromBody] SetElementActiveStateRequest request, [FromHeader(Name = "Except-Connection-Id")] string? exceptConnectionId = null)
        {
            var result = await _canvasElementService.SetElementActiveState(currentUser, request with { ExceptConnectionId = exceptConnectionId }, true);
            return result.ToIActionResult();
        }
        [HttpPatch("ScaleElement")]
        public async Task<IActionResult> ScaleElement([FromBody] ScaleCanvasElementsRequest request, [FromHeader(Name = "Except-Connection-Id")] string? exceptConnectionId = null)
        {
            var result = await _canvasElementService.ScaleElement(currentUser, request with { ExceptConnectionId = exceptConnectionId });
            return result.ToIActionResult();
        }
    }
}
