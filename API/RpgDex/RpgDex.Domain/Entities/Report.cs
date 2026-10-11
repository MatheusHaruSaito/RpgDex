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
        public string ReportOwner { get; set; }
        public string DataId { get; set; }
        public ReportEnum ReportType { get; set; }
    }
}
