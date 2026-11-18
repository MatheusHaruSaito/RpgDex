using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.UserDocument
{
    public record GetAllUserDocumentResponse(IEnumerable<UserDocumentResponse> Documents, decimal DocumentsSizeMb, int DocumentsStorageCapacity);
}
