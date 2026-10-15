using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Interfaces
{
    public interface IFileUrlBuilder
    {
        string? Build(string? iconPath);
    }
}
