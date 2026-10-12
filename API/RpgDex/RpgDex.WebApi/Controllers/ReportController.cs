using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
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
    public class ReportController(IReportService reportService) : ControllerBase
    {
        private string currentUser => User.FindFirst(ClaimTypes.NameIdentifier)?.Value;

        [HttpPost]
        public async Task<IActionResult> CreateUser(CreateReportRequest request)
        {
            var result = await reportService.Create(currentUser,request);
            return result.ToIActionResult();
        }
        [HttpGet("All/{page}/{pageSize}")]
        public async Task<IActionResult> GetAll(int page,int pageSize)
        {
            var result = await reportService.GetAll(page,pageSize);
            return result.ToIActionResult();
        }
        [HttpGet("{id}")]
        public async Task<IActionResult> GetByid(Guid id)
        {
            var result = await reportService.GetById(id);
            return result.ToIActionResult();
        }
        [HttpPatch("Close")]
        public async Task<IActionResult> GetByid(CloseReportRequest request)
        {
            var result = await reportService.Close(request);
            return result.ToIActionResult();
        }
    }
}
