using System;
using System.Collections;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Dto
{
    public record GetAllCharacterResponse(IEnumerable<CharacterResponse>Characters,int MaxCharacters, int CharacterLength);
}
