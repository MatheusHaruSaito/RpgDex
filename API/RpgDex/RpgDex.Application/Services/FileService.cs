using Microsoft.AspNetCore.Http;
using RpgDex.Application.Interfaces;
using RpgDex.Domain.Interfaces;
using ImageMagick;
using Microsoft.AspNetCore.StaticFiles;

namespace RpgDex.Application.Services
{
    public class FileService : IFileService
    {
        private readonly IFileRepository _fileRepository;
        private static readonly FileExtensionContentTypeProvider ContentTypeProvider = new();
        public FileService(IFileRepository fileRepository   )
        {
            _fileRepository = fileRepository;
        }
        public async Task<(byte[] fileBytes, string contentType)> DownloadFileAsync(string fileId)
        {
 
            var (fileBytes, fileName) = await _fileRepository.DownloadFileAsync(fileId);
            var contentType = TryGetContentType(fileName);
            if(contentType == "application/octet-stream")
            {
                contentType = GetContentTypeFromBytes(fileBytes);
            }
            return (fileBytes, contentType);
        }

        public async Task<string> UploadFileAsync(IFormFile file, string fileName)
        {

            if (file == null || file.Length == 0)
            {
                throw new ArgumentException("File is null or empty");
            }
            var extension = Path.GetExtension(file.FileName).ToLowerInvariant();
            var isImage = IsImageExtension(extension);
            using var outputStream = new MemoryStream();
            string serverFileName;
            if (isImage)
            {
                using var inputStream = file.OpenReadStream();
                using var image = new MagickImage(inputStream);

                image.Format = MagickFormat.WebP;
                image.Quality = 80;

                await image.WriteAsync(outputStream);
                serverFileName = $"{fileName}_{Guid.NewGuid()}_icon.webp";
            }
            else
            {
                await file.CopyToAsync(outputStream);
                serverFileName = $"{fileName}_{Guid.NewGuid()}{extension}";
            }


            outputStream.Position = 0;
            return await _fileRepository.UploadFileAsync(serverFileName, outputStream);

        }
        private bool IsImageExtension(string extension)
        {
            return extension switch
            {
                ".jpg" or ".jpeg" or ".png" or ".webp" or ".gif" or ".bmp" => true,
                _ => false
            };
        }
        private static string TryGetContentType(string fileName)
        {
            if (ContentTypeProvider.TryGetContentType(fileName, out var contentType))
            {
                return contentType;
            }

            return "application/octet-stream";
        }

        private static string GetContentTypeFromBytes(byte[] bytes)
        {
            if (bytes == null || bytes.Length < 4)
                return "application/octet-stream";

            // PDF: %PDF (0x25 0x50 0x44 0x46)
            if (bytes[0] == 0x25 && bytes[1] == 0x50 && bytes[2] == 0x44 && bytes[3] == 0x46)
                return "application/pdf";

            // JPEG
            if (bytes[0] == 0xFF && bytes[1] == 0xD8 && bytes[2] == 0xFF)
                return "image/jpeg";

            // PNG
            if (bytes.Length >= 8 && bytes[0] == 0x89 && bytes[1] == 0x50 && bytes[2] == 0x4E && bytes[3] == 0x47)
                return "image/png";

            // WEBP
            if (bytes.Length >= 12 && bytes[0] == 0x52 && bytes[1] == 0x49 && bytes[2] == 0x46 && bytes[3] == 0x46 &&
                bytes[8] == 0x57 && bytes[9] == 0x45 && bytes[10] == 0x42 && bytes[11] == 0x50)
                return "image/webp";

            // ZIP / DOCX / XLSX (Arquivos do Office modernos são contêineres ZIP)
            if (bytes[0] == 0x50 && bytes[1] == 0x4B && bytes[2] == 0x03 && bytes[3] == 0x04)
                return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

            return "application/octet-stream";
        }
    }
}
