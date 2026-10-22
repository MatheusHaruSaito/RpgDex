using RpgDex.Domain.Common;
using RpgDex.Application.Dto;
using System;
using System.Collections.Generic;
using System.Text;
using RpgDex.Application.Dto.User;

namespace RpgDex.Application.Interfaces
{
    public interface IUserService
    {
        Task<Result<string>> UpdateUserProfileAsync(string userId,UpdateUserProfileDTO updatedUser);
        Task<Result<UserResponse>> GetUserById(Guid Id);
        Task<Result<UserChartResponse>> GetUserChart(DateTime startDate, DateTime endDate);


    }
}
