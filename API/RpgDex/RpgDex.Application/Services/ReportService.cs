using Mapster;
using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Logging;
using RpgDex.Application.Dto;
using RpgDex.Application.Dto.Report;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Common;
using RpgDex.Domain.Entities;
using RpgDex.Domain.Enums;
using RpgDex.Domain.Interfaces;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Services
{
    public class ReportService(IReportRepository reportRepository, ICampaignRepository campaignRepository, ICharacterRepository characterRepository, UserManager<ApplicationUser> userManager, IEmailService emailService,
        IReportQueries queries, ITokenRepository tokenRepository, IFileService fileService, ILogger<ReportService> logger) : IReportService
    {
        public async Task<Result<ReportResponse>> Close(CloseReportRequest request)
        {
            var report = await reportRepository.GetByIdAsync(request.ReportId);
            if (report is null) return Result<ReportResponse>.Failure(ReportError.NotFound);

            var result = await reportRepository.SetActiveState(report.Id, false);
            if (!result)
            {
                return Result<ReportResponse>.Failure(ReportError.CloseFailed);
            }
            return Result<ReportResponse>.Success(report.Adapt<ReportResponse>());
        }

        public async Task<Result<ReportResponse>> Create(string userId, CreateReportRequest request)
        {
            if (!Guid.TryParse(userId, out var userIdGuid)) return Result<ReportResponse>.Failure(Error.InvalidUserId);

            var report = request.Adapt<Report>();
            report.Id = Guid.NewGuid();
            report.ReportOwner = userIdGuid;

            if (request.ReportType == ReportEnum.CustomReport) {
                if (request.Images is not null)
                {
                    try
                    {
                        for(int i =0;i < request.Images.Count();i++)
                        {
                            report.ImagesPath.Add(await fileService.UploadFileAsync(request.Images[i], $"{i}_{report.Id.ToString()}"));
                        }
                    }
                    catch(Exception ex)
                    {
                        logger.LogError("Exception: {ex}", ex);
                        return Result<ReportResponse>.Failure(Error.UploadImageFailed);
                    }
                }

            }
            else
            {
                var reportedUserId = await GetUserIdByReportType(request.ReportType, request.TargetId);
                var reportedUser = await userManager.FindByIdAsync(reportedUserId.ToString());

                if (reportedUser is null)
                {
                    return Result<ReportResponse>.Failure(AuthError.UserNotFound);
                }

                report.ReportedUser = reportedUserId;

            }

            var response = await reportRepository.InsertAsync(report);
            if (response is null)
            {
                return Result<ReportResponse>.Failure(ReportError.CreateFailed);
            }
            return Result<ReportResponse>.Success(response.Adapt<ReportResponse>());
        }

        public async Task<Result<GetAllReportResponse>> GetAll(int page, int pageSize,bool isActive)
        {
            var reports = await reportRepository.GetAllAsync(page, pageSize, isActive);
            if (reports is null)
            {
                return Result<GetAllReportResponse>.Failure(ReportError.NotFound);
            }
            var reportsCount = await reportRepository.GetReportsCountAsync();
            var response = new GetAllReportResponse(reports.Adapt<List<ReportResponse>>(), reportsCount);
            return Result<GetAllReportResponse>.Success(response);
        }

        public async Task<Result<ReportDetailResponse>> GetById(Guid id)
        {
            var report = await queries.GetDetailAsync(id);
            if (report is null)
            {
                return Result<ReportDetailResponse>.Failure(ReportError.NotFound);
            }
            return Result<ReportDetailResponse>.Success(report.Adapt<ReportDetailResponse>());
        }

        public async Task<Result<ReportResponse>> PunishAndCloseAsync(UserPunishRequest request)
        {
            var report = await reportRepository.GetByIdAsync(request.ReportId);
            if (report is null)
            {
                return Result<ReportResponse>.Failure(ReportError.NotFound);
            }
            var user = await userManager.FindByIdAsync(report.ReportedUser.ToString());
            if(user is null)
            {
                return Result<ReportResponse>.Failure(AuthError.UserNotFound);
            }
            if (!user.LockoutEnabled)
            {
                await userManager.SetLockoutEnabledAsync(user, true);
            }
            var lockoutEnd = DateTimeOffset.UtcNow.AddYears(100);
            var result = await userManager.SetLockoutEndDateAsync(user,lockoutEnd);

            if (!result.Succeeded)
            {
                return Result<ReportResponse>.Failure(UserError.BanFailed);
            }
            await HandleUserPunishmentSetToActive(user.Id);

            var closeResult = await reportRepository.SetActiveState(report.Id, false);
            if (!closeResult)
            {
                return Result<ReportResponse>.Failure(ReportError.CloseFailed);
            }
            return Result<ReportResponse>.Success(report.Adapt<ReportResponse>());

        }

        private async Task HandleUserPunishmentSetToActive(Guid userId)
        {
            await tokenRepository.DeleteAllUserRefreshTokensByUserIdAsync(userId);
            //Characters have a method to remove all in campaign-canvas branch
            await campaignRepository.SetAllActiveStateByUserId(userId,false);
            await campaignRepository.RemoveUserFromCampaigns(userId);
        }

        private async Task<Guid> GetUserIdByReportType(ReportEnum type,Guid DataId)
        {
            switch (type)
            {
                case ReportEnum.UserReport:
                    return DataId;

                case ReportEnum.CampaignReport:
                    var campaign = await campaignRepository.GetByIdAsync(DataId);
                    return campaign.GameMasterId;

                case ReportEnum.CharacterReport:
                    var character = await characterRepository.GetByIdAsync(DataId);
                    return character.UserId;
                default:
                    return DataId;
            }
        }
    }
}
