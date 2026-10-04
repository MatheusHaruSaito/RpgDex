using FluentValidation;
using RpgDex.Application.Dto;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Validators
{
    public class CreateUserDocumentRequestValidator : AbstractValidator<CreateUserDocumentRequest>
    {
        public CreateUserDocumentRequestValidator()
        {
            RuleFor(u => u.Name).NotNull().NotEmpty().WithMessage("Name can't be empty")
                .MaximumLength(60).WithMessage("Name can't exceed 60 characters");
            RuleFor(u => u.Description).MaximumLength(500).WithMessage("User Name can't exceed 500 characters");

            long maxSizeBytes = 5 * 1024 * 1024;
            var allowedExtensions = new[] {             
             ".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp",
            ".pdf", ".txt", ".docx", ".xlsx", ".pptx", ".csv", };
            RuleFor(u => u.File)
            .Cascade(CascadeMode.Stop)
            .NotNull().WithMessage("File can't be empty")
            .Must(file => file != null && file.Length > 0).WithMessage("File can't be empty")
            .Must(file => allowedExtensions.Contains(System.IO.Path.GetExtension(file.FileName).ToLower())).WithMessage("File must be a PDF, TXT, DOCX, XLSX, PPTX, CSV, PNG, JPG, JPEG, WEBP, GIF or BMP file")
            .Must(file => file.Length <= maxSizeBytes).WithMessage("File size must not exceed 5MB");
        }
    }
}
