using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface IWebhookSignatureValidator
    {
        bool IsValid(string? signatureHeader, string? requestId, string dataId);
    }
}
