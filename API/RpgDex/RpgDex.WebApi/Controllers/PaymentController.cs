using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RpgDex.Application.Dto.Payment;
using RpgDex.Application.Interfaces;
using RpgDex.WebApi.Extensions;
using System.Security.Claims;
using System.Text.Json;

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
        public async Task<IActionResult> WebHook(
            [FromQuery(Name = "data.id")] string? dataId,
            [FromQuery] string? type)
        {
            using var reader = new StreamReader(Request.Body);
            var raw = await reader.ReadToEndAsync();
            _logger.LogInformation("MP webhook raw body: {Body}", raw);

            MercadoPagoWebhookDto? request = null;
            if (!string.IsNullOrWhiteSpace(raw))
            {
                try
                {
                    request = JsonSerializer.Deserialize<MercadoPagoWebhookDto>(
                        raw, new JsonSerializerOptions(JsonSerializerDefaults.Web));
                }
                catch (JsonException ex)
                {
                    _logger.LogWarning(ex, "Webhook with invalid JSON body");
                }
            }

            var id = dataId ?? request?.Data?.Id;
            if (string.IsNullOrWhiteSpace(id))
            {
                _logger.LogWarning("Webhook recebido sem ID. Ignorando.");
                return Ok();
            }

            var webhookData = new MercadoPagoWebhookDto(
                Action: request?.Action,
                Type: request?.Type ?? type,
                Data: new MercadoPagoWebHookDataDto(id));

            var signatureHeader = Request.Headers["x-signature"].ToString();
            var requestIdHeader = Request.Headers["x-request-id"].ToString();
            await _paymentService.HandleWebHook(webhookData, signatureHeader, requestIdHeader);
            return Ok();
        }

    }
}
