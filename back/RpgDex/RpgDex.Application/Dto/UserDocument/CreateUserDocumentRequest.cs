using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto.UserDocument
{
    public record CreateUserDocumentRequest(string Name, string? Description, IFormFile File);
}
