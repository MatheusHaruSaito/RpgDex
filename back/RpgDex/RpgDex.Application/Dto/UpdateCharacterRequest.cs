using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;

namespace RpgDex.Application.Dto
{
    public class UpdateCharacterRequest
    {
        public Guid Id { get; set; }
        public IFormFile? Icon { get; set; }
        public string Name { get; set; }
        public string? Description { get; set; }
        public string Properties { get; set; }

    }
}
