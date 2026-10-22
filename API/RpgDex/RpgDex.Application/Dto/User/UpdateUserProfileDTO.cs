using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.User
{
    public class UpdateUserProfileDTO
    {
        public string DisplayName { get; set; }
        public IFormFile? Icon { get; set; }
    }
}
