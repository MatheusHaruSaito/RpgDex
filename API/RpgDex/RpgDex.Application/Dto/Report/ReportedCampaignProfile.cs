using RpgDex.Application.Dto.User;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record ReportedCampaignProfile
    (
    Guid Id,
    string Title,
    string? Description,
    string? IconPath,
    bool IsActive,
    DateTime CreatedAt,
    DateTime NextSession,
    int MaxPlayers,
    UserSummary? GameMaster,
    IReadOnlyList<CampaignPlayerSummary> Players,
    IReadOnlyList<CampaignCharacterSummary> Characters,
    int PendingCharacterRequests
);
}
