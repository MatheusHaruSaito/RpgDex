using RpgDex.Application.Dto.Plan;
using RpgDex.Domain.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface IPlanService
    {
        Task<Result<PlanResponse>> AddPlan(CreatePlanRequest request);
        Task<Result<PlanResponse>> GetById(Guid id);
        Task<Result<IEnumerable<PlanResponse>>> GetAll();

    }
}
