using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RpgDex.Application.Dto.Plan;
using RpgDex.Application.Interfaces;
using RpgDex.WebApi.Extensions;

namespace RpgDex.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PlanController : ControllerBase
    {
        private readonly IPlanService _planService;
        public PlanController(IPlanService planService)
        {
            _planService = planService;
        }
        [HttpPost]
        public async Task<IActionResult> AddPlan(CreatePlanRequest request)
        {
            var result = await _planService.AddPlan(request);
            return result.ToIActionResult();
        }
        [HttpGet("{id}")]
        public async Task<IActionResult> GetById(Guid id)
        {
            var result = await _planService.GetById(id);
            return result.ToIActionResult();
        }
        [HttpGet()]
        public async Task<IActionResult> GetAll()
        {
            var result = await _planService.GetAll();
            return result.ToIActionResult();
        }
    }
}
