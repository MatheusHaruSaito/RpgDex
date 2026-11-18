using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.ValueObjects
{
    public class MessageRevision
    {
        public string Data { get; set; } = string.Empty;
        public DateTime EditedAt { get; set; }

    }

}
