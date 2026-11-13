using FluentValidation;
using RpgDex.Application.Dto.Report;
using RpgDex.Domain.Common;
using RpgDex.Domain.Enums;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Validators.Report
{
    public class CreateReportRequestValidator : AbstractValidator<CreateReportRequest>
    {
        private const int MaxTitleLength = 100;
        private const int MaxDescriptionLength = 2000;
        private const int MaxImages = 10;
        private const long MaxImageSizeBytes = 2 * 1024 * 1024;

        private static readonly string[] AllowedContentTypes =
            { "image/jpeg", "image/png", "image/webp" };
        private static readonly string[] AllowedExtensions =
            { ".jpg", ".jpeg", ".png", ".webp" };

        public CreateReportRequestValidator()
        {
            RuleFor(report => report.Title)
                .NotEmpty().WithMessage("Title can't be empty").WithErrorCode(ValidationErrorCodes.ReportTitleEmpty)
                .MaximumLength(MaxTitleLength).WithMessage("Title Too Long").WithErrorCode(ValidationErrorCodes.GeneralMaxLength);

            RuleFor(report => report.Description)
                .NotEmpty().WithMessage("Description can't be empty").WithErrorCode(ValidationErrorCodes.ReportDescriptionEmpty)
                .MaximumLength(MaxDescriptionLength).WithMessage("Description Too Long").WithErrorCode(ValidationErrorCodes.GeneralMaxLength);

            RuleFor(report => report.TargetId)
                .NotEmpty().WithMessage("Target can't be empty").WithErrorCode(ValidationErrorCodes.ReportTargetEmpty)
                .When(report => report.ReportType != ReportEnum.CustomReport);

            RuleFor(report => report.ReportType)
                .IsInEnum().WithMessage("Invalid report type").WithErrorCode(ValidationErrorCodes.ReportTypeInvalid);

            RuleFor(report => report.Images)
                .Must(images => images is null || images.Count <= MaxImages)
                .WithMessage($"A maximum of {MaxImages} images is allowed")
                .WithErrorCode(ValidationErrorCodes.ReportTooManyImages);

            RuleForEach(report => report.Images).ChildRules(image =>
            {
                image.RuleFor(file => file.Length)
                    .GreaterThan(0).WithMessage("Image file is empty").WithErrorCode(ValidationErrorCodes.ImageEmpty)
                    .LessThanOrEqualTo(MaxImageSizeBytes).WithMessage("Image must be at most 5 MB").WithErrorCode(ValidationErrorCodes.ImageTooLarge);

                image.RuleFor(file => file.ContentType)
                    .Must(contentType => AllowedContentTypes.Contains(contentType))
                    .WithMessage("Invalid image format. Use JPG, PNG or WEBP")
                    .WithErrorCode(ValidationErrorCodes.ImageInvalidFormat);

                image.RuleFor(file => file.FileName)
                    .Must(name => AllowedExtensions.Contains(Path.GetExtension(name).ToLowerInvariant()))
                    .WithMessage("Invalid file extension")
                    .WithErrorCode(ValidationErrorCodes.ImageInvalidExtension);
            }).When(report => report.Images is not null);
        }
    }
}
