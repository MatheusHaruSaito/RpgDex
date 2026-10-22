using FluentValidation;
using MongoDB.Bson;
using RpgDex.Application.Dto.User;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Validators
{
    public class UpdateUserProfileDtoValidator : AbstractValidator<UpdateUserProfileDTO>
    {
        public UpdateUserProfileDtoValidator() {
            RuleFor(user => user.DisplayName)
                .NotNull().NotEmpty().WithMessage("Display Name can't be empty")
                .MaximumLength(255).WithMessage("Display Name can't exceed characters");

            When(user => user.Icon != null, () =>
            {
                long maxSizeBytes = 2 * 1024 * 1024;
                var allowedExtensions = new[] { ".jpg", ".jpeg", ".png", ".webp" }; //Permitir Gifs quando usuario premium for implementado
                RuleFor(user => user.Icon)
                .Must(file => allowedExtensions.Contains(System.IO.Path.GetExtension(file.FileName).ToLower())).WithMessage("Icon must be a JPG, JPEG, or PNG file")
                .Must(file => file.Length <= maxSizeBytes).WithMessage("Icon file size must not exceed 2MB");
            });
        }
    }
}
