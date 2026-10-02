using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record UserDocumentResponse(Guid Id, string Name, Guid UserId, string? Description, string FileUrl, string FileName, long FileSize, bool IsActive, DateTime CreatedAt);

}
