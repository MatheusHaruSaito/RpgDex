using RpgDex.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Entities
{
    public class Report
    {
        public Guid Id { get; set; }
        public string Title { get; set; }
        public string Description { get; set; }
        public Guid ReportOwner { get; set; }
        public Guid ReportedUser { get; set; }
        public Guid DataId { get; set; }
        public bool IsActive { get; set; } = true;
        public ReportEnum ReportType { get; set; }
    }
}
