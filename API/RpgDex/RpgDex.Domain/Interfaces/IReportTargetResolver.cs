using RpgDex.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface IReportTargetResolver
    {
        ReportEnum Type { get; }
        Task<object?> ResolveAsync(Guid targetId);
    }
}
