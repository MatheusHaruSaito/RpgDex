using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Infrastructure.Settings
{
    public class EmailSettings
    {
        public string ResendApiKey { get; set; }
        public string SmtpServer { get; set; }
        public int SmtpPort { get; set; }
        public string Username { get; set; }
        public string Password { get; set; }
    }
}
