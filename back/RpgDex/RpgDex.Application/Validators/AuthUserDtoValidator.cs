using FluentValidation;
using RpgDex.Application.Dto;
using RpgDex.Domain.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Validators
{
    public class AuthUserDtoValidator : AbstractValidator<AuthUserDTO>
    {
        public AuthUserDtoValidator()
        {
            RuleFor(user => user.Password)
                .NotNull().WithMessage("Password can't be empty").WithErrorCode(ValidationErrorCodes.PasswordEmpty)
                .Matches(@"[A-Z]").WithMessage("The password must contain at least one uppercase letter").WithErrorCode(ValidationErrorCodes.PasswordUppercase)
                .Matches(@"[a-z]").WithMessage("The password must contain at least one lowercase letter").WithErrorCode(ValidationErrorCodes.PasswordLowercase)
                .Matches(@"[0-9]").WithMessage("The password must contain at least one number").WithErrorCode(ValidationErrorCodes.PasswordNumber)
                .Matches(@"[^a-zA-Z0-9 ]").WithMessage("The password must contain at least one special character").WithErrorCode(ValidationErrorCodes.PasswordSpecial);
            RuleFor(user => user.Email)
                .MaximumLength(255).WithMessage("Email Too Long").WithErrorCode(ValidationErrorCodes.GeneralMaxLength)
                .EmailAddress().WithMessage("Must be a valid email address").WithErrorCode(ValidationErrorCodes.InvalidEmail);
        }
    }
}
