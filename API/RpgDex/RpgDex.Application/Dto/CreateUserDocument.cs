using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record CreateUserDocument(string Name, string? Description, IFormFile File);
}
