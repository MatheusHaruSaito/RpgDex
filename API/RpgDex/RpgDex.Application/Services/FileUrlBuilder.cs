
using RpgDex.Application.Interfaces;

namespace RpgDex.Application.Services
{

    public class FileUrlBuilder : IFileUrlBuilder
    {
        private static readonly string[] ExternalHosts =
        {
            "googleusercontent.com",
            "discordapp.com"
        };
        private readonly string _baseUrl;
        public FileUrlBuilder(string baseUrl) => _baseUrl = baseUrl.TrimEnd('/');

        public string? Build(string? iconPath)
        {
            if (string.IsNullOrEmpty(iconPath)) return null;
            if (IsExternalUrl(iconPath)) return iconPath;
            return $"{_baseUrl}/api/File/{iconPath}";
        }

        private static bool IsExternalUrl(string value)
        {
            if (!Uri.TryCreate(value, UriKind.Absolute, out var uri)) return false;
            if (uri.Scheme != Uri.UriSchemeHttps) return false;

            return ExternalHosts.Any(h =>
                uri.Host == h || uri.Host.EndsWith("." + h, StringComparison.OrdinalIgnoreCase));
        }
    }
}
