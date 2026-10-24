using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RpgDex.Application.Dto.Payment;
using RpgDex.Application.Interfaces;
using RpgDex.WebApi.Extensions;
using System.Security.Claims;

namespace RpgDex.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class PaymentController : ControllerBase
    {
        ILogger<PaymentController> _logger;
        private string? currentUser => User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        private readonly IPaymentService _paymentService;
        public PaymentController(IPaymentService paymentService, ILogger<PaymentController> logger)
        {
            _paymentService = paymentService;
            _logger = logger;
        }

        [HttpPost]
        public async Task<IActionResult> InitiatePayment(CreatePaymentRequest request)
        {
            var result = await _paymentService.PaymentInitiate(currentUser,request);
            return result.ToIActionResult();
        }
        [AllowAnonymous]
        [HttpPost("webhook")]
        public async Task<IActionResult> WebHook([FromBody] MercadoPagoWebhookDto request, [FromQuery(Name = "data.id")] string? dataId,
            [FromQuery] string? type)
        {
            Console.WriteLine("webhook");
            return Ok();
        }

    }
}
