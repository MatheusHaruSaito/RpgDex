using Microsoft.AspNetCore.Http;

namespace RpgDex.Application.Interfaces
{
    public interface IFileService
    {
        Task<(byte[] fileBytes, string contentType)> DownloadFileAsync(string fileId);
        Task<string> UploadFileAsync(IFormFile file, string fileName);
    }
}
