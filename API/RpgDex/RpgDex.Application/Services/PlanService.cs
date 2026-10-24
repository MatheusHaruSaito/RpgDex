using Mapster;
using Microsoft.AspNetCore.Mvc;
using RpgDex.Application.Dto.Plan;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Common;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Services
{
    public class PlanService(IPlanRepository planRepository) : IPlanService
    {
        public async Task<Result<PlanResponse>> AddPlan([FromBody]CreatePlanRequest request)
        {
            await planRepository.Insert(request.Adapt<Plan>());
            return Result<PlanResponse>.Success(request.Adapt<PlanResponse>());
        }

        public async Task<Result<IEnumerable<PlanResponse>>> GetAll()
        {
            var plans = await planRepository.GetAll();
            return Result<IEnumerable<PlanResponse>>.Success(plans.Adapt<IEnumerable<PlanResponse>>());
        }

        public async Task<Result<PlanResponse>> GetById(Guid id)
        {
            var plans = await planRepository.GetById(id);
            return Result<PlanResponse>.Success(plans.Adapt<PlanResponse>());
        }
    }
}
