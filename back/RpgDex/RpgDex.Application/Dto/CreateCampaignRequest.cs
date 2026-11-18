using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public class CreateCampaignRequest
    {
        public string Title { get; set; }
        public string? Description { get; set; }
        public string? Password { get; set; }
        public int MaxPlayers { get; set; }
        public IFormFile? Icon { get; set; }

    }
}
