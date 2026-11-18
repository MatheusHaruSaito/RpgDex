using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface IDiscordAuthService
    {
        Task<DiscordUser> GetDiscordUserAsync();
    }
    public record DiscordUser(string Id,string UserName, string DisplayName, string Email, string IconUrl);
}
