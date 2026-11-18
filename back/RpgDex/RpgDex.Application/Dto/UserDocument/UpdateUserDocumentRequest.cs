using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.UserDocument
{
    public record UpdateUserDocumentRequest(Guid Id, string Name, string? Description, IFormFile? File);
}
