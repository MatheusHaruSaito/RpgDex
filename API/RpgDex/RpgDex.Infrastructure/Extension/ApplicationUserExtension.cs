using RpgDex.Application.Dto.User;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Extension
{
    public static class ApplicationUserExtension
    {
        public static bool IsLocked(this ApplicationUser u) =>
        u.LockoutEnabled && u.LockoutEnd.HasValue && u.LockoutEnd.Value > DateTimeOffset.UtcNow;

        public static UserSummary ToSummary(this ApplicationUser u, IFileUrlBuilder urls) =>
            new(u.Id, u.UserName, u.DisplayName,urls.Build( u.IconPath), u.IsLocked());
    }
}
