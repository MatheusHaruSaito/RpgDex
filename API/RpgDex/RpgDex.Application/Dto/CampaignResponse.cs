using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record CampaignResponse
    (
        Guid Id,
        string Title,
        string? Description,
        bool IsActive,
        Guid GameMasterId,
        int MaxPlayers,
        DateTime NextSession,
        DateTime CreatedAt,
        string? IconPath,
        int CampaignLenght,
        IReadOnlyCollection<Guid>? PlayerIds,
        IReadOnlyCollection<Guid>? CharacterIds,
        IReadOnlyCollection<Guid>? CharacterRequests
    );
}
