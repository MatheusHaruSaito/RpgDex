using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface IFileReferenceProvider
    {
        Task<IEnumerable<string>> GetReferencedFileIdsAsync(CancellationToken ct);
    }
}
