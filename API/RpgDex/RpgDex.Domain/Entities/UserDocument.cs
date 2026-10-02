using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Entities
{
    public class UserDocument
    {
            public Guid Id { get; set; } = Guid.NewGuid();
            public string Name { get; set; } = string.Empty;
            public Guid UserId { get; set; }
            public string? Description { get; set; }
            public string FileUrl { get; set; } = string.Empty;
            public string FileName { get; set; } = string.Empty;
            public long FileSize { get; set; }
            public bool IsActive { get; set; }
            public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    }
}
