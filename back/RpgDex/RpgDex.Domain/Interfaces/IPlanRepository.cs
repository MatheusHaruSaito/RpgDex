using RpgDex.Domain.Entities;
using RpgDex.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface IPlanRepository
    {
        Task Insert(Plan plan);
        Task<IEnumerable<Plan>> GetAll();
        Task<Plan> GetById(Guid Id);
        Task AddTagAsync(Guid planId, PlanTagType tag);
        Task RemoveTagAsync(Guid planId, PlanTagType tag);
    }
}
