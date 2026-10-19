using MongoDB.Bson.Serialization.Attributes;
using RpgDex.Domain.Common;
using RpgDex.Domain.ValueObjects;

namespace RpgDex.Domain.Entities
{
    public class Campaign
    {
        [BsonElement("PlayerIds")]
        private List<Guid> _playerIds = new();

        [BsonElement("CharacterIds")]
        private List<Guid> _characterIds = new();

        [BsonElement("CharacterRequests")]
        private List<Guid> _characterRequests = new();

        public Guid Id{ get; set; }
        public string Title{ get; set; }
        public string? Description{ get; set; }
        public string? PasswordHash { get; private set; }
        public int MaxPlayers { get; set; }
        public string? IconPath { get; set; }
        public bool IsActive { get; set; } = true;
        public DateTime NextSession { get; set; } = DateTime.UtcNow;
        public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
        public Guid GameMasterId{ get; set; }
        public CampaignSettings Settings { get; set; }

        [BsonIgnore]
        public IReadOnlyCollection<Guid> PlayerIds => _playerIds.AsReadOnly();
        [BsonIgnore]
        public IReadOnlyCollection<Guid> CharacterIds => _characterIds.AsReadOnly();
        [BsonIgnore]
        public IReadOnlyCollection<Guid> CharacterRequests => _characterRequests.AsReadOnly();

        public Campaign()
        {
            Settings = new CampaignSettings();
        }

        public void SetPasswordHash(string? passwordHash)
        {
            PasswordHash = passwordHash;
        }
        public record CampaignTryActionResult(string? Message, bool IsSuccess, Error? Error);
        public CampaignTryActionResult TryAddPlayer(Guid playerId)
        {
            if (_playerIds.Contains(playerId))
                return new CampaignTryActionResult(null, false, CampaignError.AlreadyInCampaign);

            if (_playerIds.Count >= MaxPlayers)
                return new CampaignTryActionResult(null, false, CampaignError.MaxPlayersReached);

            _playerIds.Add(playerId);
            return new CampaignTryActionResult("Player added to campaign", true, null);
        }
        public CampaignTryActionResult TryAddCharacter(Guid characterId)
        {
            if (_characterIds.Contains(characterId))
                return new CampaignTryActionResult(null, false, CampaignError.CharacterAlreadyInCampaign);

            if (Settings.RequireApprovalForCharacters)
            {
                if (_characterRequests.Contains(characterId))
                {
                    return new CampaignTryActionResult(null, false, CampaignError.CharacterAwaitingApproval);
                }
                _characterRequests.Add(characterId);
                return new CampaignTryActionResult(null, true, null);
            }

            _characterIds.Add(characterId);
            return new CampaignTryActionResult("Character added to campaign", true, null);
        }

        public void Update(string title, string? description, int maxPlayers, DateTime nextSession)
        {
            Title = title;
            Description = description;
            MaxPlayers = maxPlayers;
            NextSession = nextSession;
        }
        public void UpdateSettings(CampaignSettings newSettings) => Settings = newSettings
            ?? throw new ArgumentNullException(nameof(newSettings));

        public CampaignTryActionResult TryAcceptCharacter(Guid characterId)
        {
            if (!_characterRequests.Contains(characterId))
                return new CampaignTryActionResult(null, false, CampaignError.CharacterNotInRequests);
            _characterRequests.Remove(characterId);
            _characterIds.Add(characterId);
            return new CampaignTryActionResult("Character accepted", true, null);
        }
        public CampaignTryActionResult TryRejectCharacter(Guid characterId)
        {
            if (!_characterRequests.Contains(characterId))
                return new CampaignTryActionResult(null, false, CampaignError.CharacterNotInRequests);
            _characterRequests.Remove(characterId);
            return new CampaignTryActionResult("Character rejected", true, null);
        }
        public CampaignTryActionResult TryRemoveCharacter(Guid characterId)
        {
            if (!_characterIds.Contains(characterId))
                return new CampaignTryActionResult(null, false, CampaignError.CharacterNotInCampaign);
            _characterIds.Remove(characterId);
            return new CampaignTryActionResult("Character removed", true, null);
        }
        public CampaignTryActionResult TryRemovePlayer(Guid playerId)
        {
            if (!PlayerIds.Contains(playerId))
                return new CampaignTryActionResult(null, false, CampaignError.PlayerNotInCampaign);
            _playerIds.Remove(playerId);
            return new CampaignTryActionResult("Player removed from campaign", true, null);
        }
    }
}
