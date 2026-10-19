using FluentValidation;
using RpgDex.Application.Dto;
using RpgDex.Domain.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Validators
{
    public class UpdateCharacterRequestValidator : AbstractValidator<UpdateCharacterRequest>
    {
        public UpdateCharacterRequestValidator()
        {

            RuleFor(character => character.Name)
                .NotNull().WithMessage("Name can't be empty").WithErrorCode(ValidationErrorCodes.GeneralEmpty)
                .NotEmpty().WithMessage("Name can't be empty").WithErrorCode(ValidationErrorCodes.GeneralEmpty)
                .MaximumLength(60).WithMessage("Name can't exceed 60 digits").WithErrorCode(ValidationErrorCodes.GeneralMaxLength);

            RuleFor(character => character.Description)
                .MaximumLength(2000).WithMessage("Description can't exceed 2000 digits").WithErrorCode(ValidationErrorCodes.GeneralMaxLength);

            When(character => character.Icon != null, () =>
            {
                long maxSizeBytes = 2 * 1024 * 1024;
                var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" };

                RuleFor(character => character.Icon)
                    .Must(file => allowedExtensions.Contains(Path.GetExtension(file.FileName).ToLower())).WithMessage("Icon must be a JPG, JPEG, or PNG file").WithErrorCode(ValidationErrorCodes.InvalidFileExtension)
                    .Must(file => file.Length <= maxSizeBytes).WithMessage("Icon file size must not exceed 2MB").WithErrorCode(ValidationErrorCodes.FileTooLarge);
            });

        }
    }
}
