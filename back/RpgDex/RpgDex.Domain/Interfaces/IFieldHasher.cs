using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface IFieldHasher
    {
        string Hash(string normalizedValue);
    }
}
