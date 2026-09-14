using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RpgDex.Application.Common;
using RpgDex.Application.Dto;
using RpgDex.Application.Interfaces;
using RpgDex.Application.Services;
using RpgDex.WebApi.Extensions;
using System.Security.Claims;

namespace RpgDex.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class CampaignController : ControllerBase
    {
        private string currentUser => User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        ICampaignService _campaignService;
        public CampaignController(ICampaignService campaignService)
        {
            _campaignService = campaignService;
        }

        [HttpGet("All")]
        public async Task<IActionResult> GetAllByUserId()
        {
            var result = await _campaignService.GetAllByUserId(currentUser);
            return result.ToIActionResult();
        }
        [HttpGet("All/{page}/{pageSize}")]
        public async Task<IActionResult> GetAllByUserId(int page, int pageSize)
        {
            var result = await _campaignService.GetAllByUserId(currentUser,page,pageSize);
            return result.ToIActionResult();
        }
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _campaignService.GetById(id);
            return result.ToIActionResult();
        }
        [HttpPost]
        public async Task<IActionResult> Create(CreateCampaignRequest request)
        {
            var result = await _campaignService.Create(currentUser, request);
            return result.ToIActionResult();
        }
        [HttpPut]
        public async Task<IActionResult> Update(UpdateCampaignRequest request)
        {
            var result = await _campaignService.Update(currentUser ,request);
            return result.ToIActionResult();
        }
        [HttpPut("SetActiveState")]
        public async Task<IActionResult> SetActiveState(CampaignSetActiveStateRequest request)
        {

            var result = await _campaignService.SetActiveState(currentUser, request);
            return result.ToIActionResult();
        }
        [HttpPut("AddPlayer")]
        public async Task<IActionResult> JoinCampaignRequest(JoinCampaignRequest request)
        {

            var result = await _campaignService.AddPlayer(currentUser, request);
            return result.ToIActionResult();
        }
        [HttpPut("AddCharacter")]
        public async Task<IActionResult> AddCharacterRequest(AddCharacterToCampaignRequest request)
        {

            var result = await _campaignService.AddCharacter(currentUser, request);
            return result.ToIActionResult();
        }
        [HttpPatch("RemoveCharacter")]
        public async Task<IActionResult> RemoveCharacterReuqest(RemoveCharacterFromCapaignRequest request)
        {

            var result = await _campaignService.RemoveCharacter(currentUser, request);
            return result.ToIActionResult();
        }
        [HttpPut("AcceptCharacter")]
        public async Task<IActionResult> AcceptCharacter(AcceptCharacterToCampaignRequest request)
        {
            var result = await _campaignService.AcceptCharacter(currentUser, request);
            return result.ToIActionResult();
        }

        [HttpPut("RemovePlayer")]
        public async Task<IActionResult> RemovePlayer(RemovePlayerFromCampaignRequest request)
        {

            var result = await _campaignService.RemovePlayer(currentUser, request);
            return result.ToIActionResult();
        }
        [HttpPut("UpdateSettings")]
        public async Task<IActionResult> UpdateSettings(UpdateCampaignSettingsRequest request)
        {

            var result = await _campaignService.UpdateConfiguration(currentUser,request);
            return result.ToIActionResult();
        }
        [HttpPost("SendMessage")]
        public async Task<IActionResult> SendMessage(CampaignChatMessageRequest request)
        {

            var result = await _campaignService.SendMessage(currentUser, request);
            return result.ToIActionResult();
        }
        [HttpGet("GetMessages/{campaignId}")]
        public async Task<IActionResult> GetMessages(Guid campaignId)
        {
            var result = await _campaignService.GetChatMessages(campaignId);
            return result.ToIActionResult();
        }
    }
}
