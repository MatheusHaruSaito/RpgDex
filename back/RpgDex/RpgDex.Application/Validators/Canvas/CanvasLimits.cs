using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Validators.Canvas
{
    public class CanvasLimits
    {
        public const int MaxContentLength = 500;
        public const int MaxImageLength = 2_000_000;
        public const int MaxPoints = 5000;
        public const int MaxItemsPerRequest = 200;
        public const double MaxCoordinate = 1_000_000;
        public const double MinScale = 0.1;
        public const double MaxScale = 10;
        public const double MaxStrokeWidth = 100;
        public const long MaxImageBytes = 5 * 1024 * 1024;
        public static readonly string[] AllowedImageExtensions = { ".jpg", ".jpeg", ".png", ".webp" };
    }
}
