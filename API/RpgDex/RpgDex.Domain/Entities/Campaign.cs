using MongoDB.Bson.Serialization.Attributes;
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
        public (string message, bool IsSuccess) TryAddPlayer(Guid playerId)
        {
            if (_playerIds.Contains(playerId))
                return ("Player already in campaign", false);

            if (_playerIds.Count >= MaxPlayers)
                return ("Failed to add player to campaign / max player capacity", false);

            _playerIds.Add(playerId);
            return ("Player added to campaign", true);
        }
        public (string message, bool IsSuccess) TryAddCharacter(Guid characterId)
        {
            if (_characterIds.Contains(characterId))
                return ("Character already in campaign", false);

            if (Settings.RequireApprovalForCharacters)
            {
                if (_characterRequests.Contains(characterId))
                {
                    return ("Character awaiting for approval", false);
                }
                _characterRequests.Add(characterId);
                return ("request sent to game master", true);
            }

            _characterIds.Add(characterId);
            return ("Character added to campaign", true);
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

        public (string message, bool IsSuccess) TryAcceptCharacter(Guid characterId)
        {
            if (!_characterRequests.Contains(characterId))
                return ("Character is not in the list", false);
            _characterRequests.Remove(characterId);
            _characterIds.Add(characterId);
            return ("Character accepted", true);
        }
        public (string message, bool IsSuccess) TryRejectCharacter(Guid characterId)
        {
            if (!_characterRequests.Contains(characterId))
                return ("Character is not in the list.", false);
            _characterRequests.Remove(characterId);
            return ("Character rejected", true);
        }
        public (string message, bool IsSuccess) TryRemoveCharacter(Guid characterId)
        {
            if (!_characterIds.Contains(characterId))
                return ("Character is not in the list.", false);
            _characterIds.Remove(characterId);
            return ("Character removed", true);
        }
        public (string message, bool IsSuccess) TryRemovePlayer(Guid playerId)
        {
            if (!PlayerIds.Contains(playerId))
                return ("Player is not in campaign", false);
            _playerIds.Remove(playerId);
            return ("Player removed from campaign", true);
        }
    }
}
