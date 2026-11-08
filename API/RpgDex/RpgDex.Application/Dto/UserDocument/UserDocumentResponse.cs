using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.UserDocument
{
    public record UserDocumentResponse(Guid Id, string Name, Guid UserId, string? Description, string FilePath, string FileName, long FileSize, bool IsActive, DateTime CreatedAt);

}
