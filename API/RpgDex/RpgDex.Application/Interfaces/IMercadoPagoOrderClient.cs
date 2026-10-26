using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json.Serialization;

namespace RpgDex.Application.Interfaces
{
    public interface IMercadoPagoOrderClient
    {
        Task<MpOrderResponse> CreateAsync(MpCreateOrderRequest request, string idempotencyKey);

        Task<MpOrderResponse?> GetAsync(string orderId);
    }

    /**
    curl -X POST \
    'https://api.mercadopago.com/v1/orders'\
    -H 'Content-Type: application/json' \
       -H 'Authorization: Bearer ' \
       -H 'X-Idempotency-Key: 74ab270f-358a-44a4-ab47-56ea51d168ef' \
    -d '{
  "type": "online",
  "total_amount": "50.00",
  "external_reference": "ext_ref_1234",
  "processing_mode": "manual",
  "capture_mode": "automatic_async",
  "marketplace_fee": "11.20",
  "expiration_time": "P1D",
  "payer": {
    "email": "test_payer@example.com",
    "first_name": "João",
    "last_name": "Silva",
    "phone": {
      "area_code": "11",
      "number": "999998888"
    },
    "identification": {
      "type": "CPF",
      "number": "19119119100"
    },
    "address": {
      "zip_code": "06233-903",
      "street_name": "Rua das Flores",
      "street_number": "3003",
      "neighborhood": "Bonfim",
      "city": "Osasco"
    }
  },
  "config": {
    "statement_descriptor": "MYSTORE",
    "default_payment_due_date": "P1D",
    "online": {
      "available_from": "2026-01-01T00:00:00Z",
      "allowed_user_type": "account_only",
      "success_url": "https://www.example.com/success",
      "failure_url": "https://www.example.com/failure",
      "pending_url": "https://www.example.com/pending",
      "auto_return": "approved",
      "tracks": [
        {
          "type": "google_ad",
          "values": {
            "conversion_id": "21312312312123",
            "conversion_label": "TEST",
            "pixel_id": "21312312312123"
          }
        }
      ]
    },
    "payment_method": {
      "max_installments": 12,
      "not_allowed_ids": [
        "amex"
      ],
      "not_allowed_types": [
        "credit_card"
      ],
      "installments": {
        "interest_free": {
          "type": "range",
          "values": [
            2,
            6
          ]
        }
      }
    }
  },
  "items": [
    {
      "external_code": "ITEM-001",
      "title": "Product 001",
      "description": "Product description",
      "category_id": "travels",
      "picture_url": "https://example.com/img.jpg",
      "quantity": 1,
      "unit_price": "1000.00",
      "type": "travel",
      "warranty": false,
      "event_date": "2014-06-28T16:53:03.176-04:00"
    }
  ],
  "additional_info": {
    "payer.registration_date": "2020-01-15T00:00:00.000-03:00",
    "payer.authentication_type": "MOBILE",
    "payer.is_prime_user": false,
    "payer.is_first_purchase_online": false,
    "payer.last_purchase": "2025-12-01T00:00:00.000-03:00",
    "travel.passengers": [
      {
        "first_name": "John",
        "last_name": "Smith",
        "identification_type": "DNI",
        "identification_number": "12345678909",
        "item_references": [
          "ITEM-001"
        ]
      }
    ],
    "travel.routes": [
      {
        "departure": "SAO",
        "destination": "RIO",
        "departure_date_time": "2026-03-10T08:00:00.000-03:00",
        "arrival_date_time": "2026-03-10T09:00:00.000-03:00",
        "company": "TAM",
        "item_references": [
          "ITEM-001"
        ]
      }
    ]
  },
  "description": "Smartphone"
}
'**/
    // - Requests
    public sealed class MpCreateOrderRequest
    {
        [JsonPropertyName("type")] public string Type { get; init; } = "online";
        [JsonPropertyName("total_amount")] public required string TotalAmount { get; init; }

        [JsonPropertyName("external_reference")]
        public required string ExternalReference { get; init; }

        [JsonPropertyName("processing_mode")] public string ProcessingMode { get; init; } = "manual";

        [JsonPropertyName("payer")] public required MpOrderPayer Payer { get; init; }

        [JsonPropertyName("items")] public required List<MpOrderItem> Items { get; init; }
        [JsonPropertyName("config")] public MpOrderConfig? Config { get; init; }
        [JsonPropertyName("additional_info")] public MpOrderAdditionalInfo? AdditionalInfo { get; init; }
    }
    public sealed class MpOrderPayer
    {
        [JsonPropertyName("email")] public required string Email { get; init; }
        [JsonPropertyName("first_name")] public required string FirstName { get; init; }
        [JsonPropertyName("identification")] public required MpOrderIdentification Identification { get; init; }
    }
    public sealed class MpOrderIdentification
    {
        [JsonPropertyName("type")] public string Type { get; init; } = "CPF";
        [JsonPropertyName("number")] public required string Number { get; init; }
    }
    public sealed class MpOrderItem
    {
        [JsonPropertyName("title")] public required string Title { get; init; }
        [JsonPropertyName("description")] public required string Description { get; init; }
        [JsonPropertyName("category_id")] public string Category_id { get; init; } = "services";
        [JsonPropertyName("unit_price")] public required string UnitPrice { get; init; }
        [JsonPropertyName("quantity")] public int Quantity { get; init; } = 1;
    }

    public sealed class MpOrderConfig
    {
        [JsonPropertyName("online")] public MpOnlineConfig? Online { get; init; }

        [JsonPropertyName("statement_descriptor")]
        public string StatementDescriptor { get; init; } = "RpgDex";
    }

    public sealed class MpOnlineConfig
    {
        [JsonPropertyName("success_url")] public string? SuccessUrl { get; init; }
        [JsonPropertyName("failure_url")] public string? FailureUrl { get; init; }
        [JsonPropertyName("pending_url")] public string? PendingUrl { get; init; }
        [JsonPropertyName("auto_return")] public string? AutoReturn { get; init; }
    }

    public sealed class MpOrderAdditionalInfo
    {
        [JsonPropertyName("payer.registration_date")] public string? PayerRegistrationDate { get; init; }
    }
    //Response
    public sealed class MpOrderResponse
    {
        [JsonPropertyName("id")] public string? Id { get; set; }
        [JsonPropertyName("status")] public string? Status { get; set; }
        [JsonPropertyName("status_detail")] public string? StatusDetail { get; set; }

        [JsonPropertyName("external_reference")]
        public string? ExternalReference { get; set; }

        [JsonPropertyName("checkout_url")] public string? CheckoutUrl { get; set; }

        [JsonPropertyName("transactions")] public MpTransactions? Transactions { get; set; }
    }

    public sealed class MpTransactions
    {
        [JsonPropertyName("payments")] public List<MpPayment>? Payments { get; set; }
    }

    public sealed class MpPayment
    {
        [JsonPropertyName("id")] public string? Id { get; set; }
        [JsonPropertyName("status")] public string? Status { get; set; }
        [JsonPropertyName("payment_method")] public MpPaymentMethod? PaymentMethod { get; set; }
    }

    public sealed class MpPaymentMethod
    {
        [JsonPropertyName("id")] public string? Id { get; set; }
        [JsonPropertyName("type")] public string? Type { get; set; }
    }

}
