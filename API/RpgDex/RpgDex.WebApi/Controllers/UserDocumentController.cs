using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RpgDex.Application.Dto;
using RpgDex.Application.Services;
using RpgDex.WebApi.Extensions;
using System.Security.Claims;

namespace RpgDex.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class UserDocumentController(UserDocumentService userDocumentService) : ControllerBase
    {
        private string currentUserId => User.FindFirst(ClaimTypes.NameIdentifier).Value;
        [HttpPost]
        public async Task<IActionResult> UploadFile(CreateUserDocument request)
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
            var result = await userDocumentService.GetById(id);
            return result.ToIActionResult();
        }
        [HttpPut]
        public async Task<IActionResult> Update(UpdateUserDocumentRequest request)
        {
            var result = await userDocumentService.Update(currentUserId, request);
            return result.ToIActionResult();
        }
        [HttpPatch("deactivate")]
        public async Task<IActionResult> UpdateActiveState(UserDocumentSetActiveStateRequest request)
        {
            var result = await userDocumentService.SetActiveState(currentUserId, request,false);
            return result.ToIActionResult();
        }
    }
}
