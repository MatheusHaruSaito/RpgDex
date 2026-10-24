using Microsoft.Extensions.Logging;
using RpgDex.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;

namespace RpgDex.Application.Services
{
    public class MercadoPagoOrderClient : IMercadoPagoOrderClient
    {
        private readonly JsonSerializerOptions JsonOptions = new()
        {
            DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
        };
        private readonly HttpClient _http;
        public MercadoPagoOrderClient(HttpClient http)
        {
            _http = http;
        }
        public async Task<MpOrderResponse> CreateAsync(MpCreateOrderRequest request, string idempotencyKey)
        {
            using var message = new HttpRequestMessage(HttpMethod.Post, "v1/orders")
            {
                Content = JsonContent.Create(request,options: JsonOptions)
            };
            message.Headers.Add("X-Idempotency-Key",idempotencyKey);

            using var response = await _http.SendAsync(message);
            await EnsureSuccessAsync(response);
            return await response.Content.ReadFromJsonAsync<MpOrderResponse>(JsonOptions)
                ?? throw new InvalidOperationException("Null reponse on order create in Mercado Pago"); ;
        }

        public async Task<MpOrderResponse> GetAsync(string orderId)
        {
            using var response = await _http.GetAsync($"v1/orders/{Uri.EscapeDataString(orderId)}");

            await EnsureSuccessAsync(response);

            return await response.Content.ReadFromJsonAsync<MpOrderResponse>(JsonOptions)
                ?? throw new InvalidOperationException($"Order: {orderId} Not Found");
        }
        private static async Task EnsureSuccessAsync(HttpResponseMessage response)
        {
            if (response.IsSuccessStatusCode) return;

            var body = await response.Content.ReadAsStringAsync();
            throw new HttpRequestException(
                $"MercadoPago return: {(int)response.StatusCode}: {body}", null, response.StatusCode);
        }
    }
}
