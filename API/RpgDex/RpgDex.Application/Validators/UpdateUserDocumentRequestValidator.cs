using FluentValidation;
using RpgDex.Application.Dto;
using RpgDex.Domain.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Validators
{
    public class UpdateUserDocumentRequestValidator : AbstractValidator<UpdateUserDocumentRequest>
    {
        public UpdateUserDocumentRequestValidator()
        {
            RuleFor(u => u.Name)
                .NotNull().NotEmpty().WithMessage("Name can't be empty").WithErrorCode(ValidationErrorCodes.GeneralEmpty)
                .MaximumLength(60).WithMessage("Name can't exceed 60 characters").WithErrorCode(ValidationErrorCodes.GeneralMaxLength);

            RuleFor(u => u.Description)
                .MaximumLength(500).WithMessage("User Name can't exceed 500 characters").WithErrorCode(ValidationErrorCodes.GeneralMaxLength);

            long maxSizeBytes = 10 * 1024 * 1024;
            var allowedExtensions = new[] {
                ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp",
                ".pdf", ".txt", ".docx", ".xlsx", ".pptx", ".csv"
            };

            When(u => u.File != null, () =>
            {
                RuleFor(u => u.File)
                    .Cascade(CascadeMode.Stop)
                    .Must(file => allowedExtensions.Contains(Path.GetExtension(file.FileName).ToLower())).WithMessage("File must be a PDF, TXT, DOCX, XLSX, PPTX, CSV, PNG, JPG, JPEG, WEBP, GIF or BMP file").WithErrorCode(ValidationErrorCodes.InvalidFileExtension)
                    .Must(file => file.Length <= maxSizeBytes).WithMessage("File size must not exceed 10MB").WithErrorCode(ValidationErrorCodes.FileTooLarge);
            });
        }
    }
}
