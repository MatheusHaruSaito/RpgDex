using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.AspNetCore.Mvc;
using RpgDex.Domain.Common;
using RpgDex.Application.Dto;
using RpgDex.Application.Interfaces;
using RpgDex.WebApi.Extensions;
using System.Security.Claims;


namespace RpgDex.WebApi.Controllers
        {
        [Route("api/[controller]")]
        [ApiController]
        [Authorize]
        public class CharacterController : ControllerBase
        {
        private string? currentUser => User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            private readonly ICharacterService _characterSevice;
            public CharacterController(ICharacterService characterSevice)
            {
                _characterSevice = characterSevice;
            }

            [HttpPost]
            public async Task<IActionResult> CreateCharacter(CreateCharacterRequest request)
            {
            var result = await _characterSevice.Create(currentUser, request);
                return result.ToIActionResult();
            }

            [HttpGet("All/")]
            public async Task<IActionResult> GetAllByUserId()
            {
                var result = await _characterSevice.GetAllByUserIdAsync(currentUser);
                return result.ToIActionResult();

            }
            [HttpGet("All/{page}/{pageSize}")]
            public async Task<IActionResult> GetAllByUserId(int page = 1, int pageSize = 3)
            {
            var result = await _characterSevice.GetAllByUserIdAsync(currentUser,page,pageSize);
                return result.ToIActionResult();

            }

            [HttpGet("{Id}")]
            public async Task<IActionResult> GetById(Guid Id)
            { 

                var result = await _characterSevice.GetByIdAsync(Id);
                return result.ToIActionResult();
            }

            [HttpPut("SetActiveState/{Id}")]
            public async Task<IActionResult> SetActiveState(Guid Id,bool state)
            {

                var result = await _characterSevice.SetActiveState(Id, state);
                return result.ToIActionResult();
            }

            [HttpPut]
            public async Task<IActionResult> Update(UpdateCharacterRequest request)
            {
            var result = await _characterSevice.UpdateAsync(currentUser, request);
                return result.ToIActionResult();
            }

            [HttpPatch("LastAccess/{id}")]
            public async Task<IActionResult> PatchCharacterLastAccess(Guid id)
            {
                var result = await _characterSevice.UpdateLastAccess(id);
                return result.ToIActionResult();
            }
    }
    }
