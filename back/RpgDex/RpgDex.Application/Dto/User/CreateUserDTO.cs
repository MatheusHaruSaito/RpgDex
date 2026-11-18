using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.User
{
    public class CreateUserDTO
    {
        public string Email { get; set; }
        public string UserName { get; set; }
        public string Password { get; set; }

    }
}
