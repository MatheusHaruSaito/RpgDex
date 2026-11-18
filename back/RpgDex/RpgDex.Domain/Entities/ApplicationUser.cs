using AspNetCore.Identity.MongoDbCore.Models;
using RpgDex.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace RpgDex.Domain.Entities
{
    public class ApplicationUser : MongoIdentityUser<Guid>
    {
        public string? DisplayName { get; set; }
        public List<Guid> CharactersId { get; set; }  = new List<Guid>();
        public List<Guid> CampaignsId { get; set; } = new List<Guid>();
        public string? IconPath { get; set; }
        public DateOnly? BirthDate { get; set; }
        public string? Cpf { get; set; }
        public string? CpfHash { get; set; }
        public string? GuardianCpf { get; set; }
        public string? GuardianEmail { get; set; }
        public GuardianConsentStatus GuardianConsent { get; set; } = GuardianConsentStatus.NotRequired;
        public DateTime? AgeVerifiedAt { get; set; }
        public DateTime? GuardianEmailSentAt { get; set; }
    }
}
