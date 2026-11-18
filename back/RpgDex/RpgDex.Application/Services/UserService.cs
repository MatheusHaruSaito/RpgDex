using FluentValidation;
using Mapster;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using RpgDex.Application.Dto;
using RpgDex.Application.Dto.User;
using RpgDex.Application.Extension;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Common;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Interfaces;

namespace RpgDex.Application.Services
{
    public class UserService(UserManager<ApplicationUser> userManager, IUserQueries userQueries,IFileService fileService,IUserRepository userRepository, IValidator<UpdateUserProfileDTO> updateUserProfileValidator, 
        ILogger<UserService> logger) : IUserService
    {
        public async Task<Result<UserResponse>> GetUserById(Guid Id)
        {
            var user = await userManager.FindByIdAsync(Id.ToString());
            if (user is null)
            {
                return Result<UserResponse>.Failure(AuthError.UserNotFound);
            }
            var userResponse = user.Adapt<UserResponse>();
            return Result<UserResponse>.Success(userResponse);
        }

        public async Task<Result<ChartResponse>> GetUserChart(DateTime startDate, DateTime endDate)
        {
            var result = await userQueries.GetUserChart(startDate, endDate);
            if(result is null)
            {
                Result<ChartResponse>.Failure(UserError.UserChartNotFound);
            }
            return Result<ChartResponse>.Success(result!);
        }

        public async Task<Result<string>> UpdateUserProfileAsync(string userId,UpdateUserProfileDTO updatedUser)
        {
            var checkUpdateUserValid = updateUserProfileValidator.Validate(updatedUser);
            if (!checkUpdateUserValid.IsValid) return checkUpdateUserValid.ReturnErrors<string>();
            var user = await userManager.FindByIdAsync(userId);

            if(user is null)
            {
                return Result<string>.Failure(AuthError.UserNotFound);
            }
            user.DisplayName = updatedUser.DisplayName;

            if(updatedUser.Icon is not null)
            {
                try
                {
                    user.IconPath = await fileService.UploadFileAsync(updatedUser.Icon, user.Id.ToString());
                }
                catch
                {
                    return Result<string>.Failure(Error.UploadImageFailed);
                }
            }

            var result = await userManager.UpdateAsync(user);
            if (!result.Succeeded)
            {
                return Result<string>.Failure(UserError.UpdateFailed);
            }
            return Result<string>.Success("Profile updated successfully!");
        }

        public async Task<Result<IEnumerable<UserSummary>>> GetUserSummaryByUserNameOrEmail(string target,int page=1,int pageSize=5)
        {
            var user = await userRepository.GetAllByEmailOrUserNameAsync(target,page,pageSize);
            if (user is null)
            {
                return Result<IEnumerable<UserSummary>>.Failure(AuthError.UserNotFound);
            }
            var userResponse = user.Adapt<IEnumerable<UserSummary>>();
            return Result<IEnumerable<UserSummary>>.Success(userResponse);
        }
    }
}
