using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public class UserResponse
    {
        public string UserName {  get; set; }
        public string DisplayName { get; set; }
        public string Email { get; set; }
        public string? IconPath { get; set; }
    }
}
