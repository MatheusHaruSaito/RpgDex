using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using RpgDex.Application.Dto;
using RpgDex.Application.Interfaces;
using RpgDex.WebApi.Extensions;
using System.Security.Claims;

namespace RpgDex.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class UserDocumentController(IUserDocumentService userDocumentService) : ControllerBase
    {
        private string currentUserId => User.FindFirst(ClaimTypes.NameIdentifier).Value;
        [HttpPost]
        public async Task<IActionResult> UploadFile([FromForm] CreateUserDocumentRequest request)
        {
            var result = await userDocumentService.Create(currentUserId, request);
            return result.ToIActionResult();
        }
        [HttpGet]
        public async Task<IActionResult> GetAllByUserId([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
        {
            var result = await userDocumentService.GetAllByUserId(currentUserId, page, pageSize);
            return result.ToIActionResult();
        }
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await userDocumentService.GetById(currentUserId,id);
            return result.ToIActionResult();
        }
        [HttpPut]
        public async Task<IActionResult> Update([FromForm] UpdateUserDocumentRequest request)
        {
            var result = await userDocumentService.Update(currentUserId, request);
            return result.ToIActionResult();
        }
        [HttpPatch("Deactivate")]
        public async Task<IActionResult> UpdateActiveState([FromForm] UserDocumentSetActiveStateRequest request)
        {
            var result = await userDocumentService.SetActiveState(currentUserId, request,false);
            return result.ToIActionResult();
        }
        [HttpPatch("GiveAccess")]
        public async Task<IActionResult> GiveAccess([FromForm] GiveUserAccessToDocumentRequest request)
        {
            var result = await userDocumentService.UpdateUserAccess(currentUserId, request, true);
            return result.ToIActionResult();
        }
        [HttpPatch("RemoveAccess")]
        public async Task<IActionResult> RemoveAccess([FromForm] GiveUserAccessToDocumentRequest request)
        {
            var result = await userDocumentService.UpdateUserAccess(currentUserId, request, false);
            return result.ToIActionResult();
        }
    }
}
