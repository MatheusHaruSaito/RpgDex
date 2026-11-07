using RpgDex.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.ValueObjects
{
    public class SubscriptionLedgerEntry
    {
        public Guid PaymentId { get; set; }
        public LedgerEntryKind Kind { get; set; }
        public long ExpiresDeltaTicks { get; set; }
        public long StartDeltaTicks { get; set; }
    }
}
