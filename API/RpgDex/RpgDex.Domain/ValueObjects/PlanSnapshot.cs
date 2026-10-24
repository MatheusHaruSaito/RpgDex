using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.ValueObjects
{
    public class PlanSnapshot
    {
        public string Name { get; set; } = default!;
        public decimal Price { get; set; }
        public int DurationDays { get; set; }
    }
}
