using Microsoft.AspNetCore.DataProtection;
using RpgDex.Application.Interfaces;
using System;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Text;

namespace RpgDex.Infrastructure.Services
{
    public class LinkTicketService : ILinkTicketService
    {
        private readonly ITimeLimitedDataProtector _protector;

        public LinkTicketService(IDataProtectionProvider provider)
            => _protector = provider.CreateProtector("DiscordLinkTicket").ToTimeLimitedDataProtector();

        public string Create(string userId)
            => _protector.Protect(userId.ToString(), TimeSpan.FromMinutes(2));

        public string? Validate(string ticket)
        {
            try { return _protector.Unprotect(ticket); }
            catch (CryptographicException) { return null; }
        }
    }
}
