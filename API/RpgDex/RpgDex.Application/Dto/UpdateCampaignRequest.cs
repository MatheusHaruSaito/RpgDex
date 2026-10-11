using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public class UpdateCampaignRequest
    {
        public Guid Id { get; set; }
        public string Title { get; set; }
        public string? Description { get; set; }
        public DateTime NextSession { get; set; }
        public IFormFile? Icon { get; set; }
        public int MaxPlayers { get; set; }
        public string? newPassword { get; set; }

    }
}
