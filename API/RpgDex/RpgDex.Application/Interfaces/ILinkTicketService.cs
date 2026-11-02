using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface ILinkTicketService
    {
        string Create(string userId);
        string? Validate(string ticket);
    }
}
