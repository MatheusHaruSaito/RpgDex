using Microsoft.AspNetCore.Http;
using System;
using System.Collections.Generic;
using System.Text;
using System.Text.Json;

namespace RpgDex.Application.Dto
{
    public record CreateCharacterRequest(string Name, string? Description, IFormFile? Icon, string? Properties);
}
