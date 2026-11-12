using RpgDex.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.Plan
{
    public record TagToPlanRequest(Guid Id, PlanTagType Tag);
}
