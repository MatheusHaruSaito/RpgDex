using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface IFileRepository
    {
        Task<string> UploadFileAsync(string fileName, Stream fileStream);
        Task<(byte[] fileBytes, string fileName)> DownloadFileAsync(string fileId);
        Task<int> DeleteOrphanFilesAsync(IEnumerable<string> idsInUse, TimeSpan minimumAge, CancellationToken ct = default);
    }
}
