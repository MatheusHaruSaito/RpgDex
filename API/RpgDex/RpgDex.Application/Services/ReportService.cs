using Mapster;
using RpgDex.Application.Dto;
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
    public class ReportService(IReportRepository reportRepository,ICampaignRepository campaignRepository,ICharacterRepository characterRepository) : IReportService
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
            report.ReportOwner = userIdGuid;
            report.ReportedUser = await GetUserIdByReportType(request.ReportType, request.DataId);
            var response = await reportRepository.InsertAsync(report);
            if (response is null)
            {
                return Result<ReportResponse>.Failure(ReportError.CreateFailed);
            }
            return Result<ReportResponse>.Success(response.Adapt<ReportResponse>());
        }

        public async Task<Result<GetAllReportResponse>> GetAll(int page, int pageSize)
        {
            var reports = await reportRepository.GetAllAsync(page, pageSize);
            if (reports is null)
            {
                return Result<GetAllReportResponse>.Failure(ReportError.NotFound);
            }
            var reportsCount = await reportRepository.GetReportsCountAsync();
            var response = new GetAllReportResponse(reports.Adapt<IEnumerable<ReportResponse>>(), reportsCount);
            return Result<GetAllReportResponse>.Success(response);
        }

        public async Task<Result<ReportResponse>> GetById(Guid id)
        {
            var report = await reportRepository.GetByIdAsync(id);
            if (report is null)
            {
                return Result<ReportResponse>.Failure(ReportError.NotFound);
            }
            return Result<ReportResponse>.Success(report.Adapt<ReportResponse>());
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
