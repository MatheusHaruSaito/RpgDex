using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using RpgDex.Application.Interfaces;
using RpgDex.Application.Services;

namespace RpgDex.WebApi.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class FileController : ControllerBase
    {
        private readonly IFileService _fileService;
        public FileController(IFileService fileService)
        {
            _fileService = fileService;
        }
        [HttpGet("{id}")]
        public async Task<IActionResult> GetFile(string id)
        {

            var (fileBytes, contentType) = await _fileService.DownloadFileAsync(id);
            if (fileBytes is null || fileBytes.Length == 0)
            {
                return NotFound("File not found.");
            }

            return File(fileBytes, contentType);
        }
    }
}
