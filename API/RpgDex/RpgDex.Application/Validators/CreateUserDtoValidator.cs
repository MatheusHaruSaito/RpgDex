using FluentValidation;
using RpgDex.Application.Dto;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Validators
{
    public class CreateUserDtoValidator : AbstractValidator<CreateUserDTO>
    {
        public CreateUserDtoValidator()
        {
            RuleFor(user => user.Password)
                .NotNull().WithMessage("Password can't be empty")
                .Matches(@"[A-Z]").WithMessage("The password must contain at least one uppercase letter")
                .Matches(@"[a-z]").WithMessage("The password must contain at least one lowercase letter")
                .Matches(@"[0-9]").WithMessage("The password must contain at least one number")
                .Matches(@"[^a-zA-Z0-9 ]").WithMessage("The password must contain at least one special character");
            RuleFor(user => user.UserName)
                .NotNull().NotEmpty().WithMessage("UserName can't be empty")
                .MaximumLength(255).WithMessage("User Name can't exceed 255 characters")
                .Must(u => !u.Contains(' ')).WithMessage("UserName cannot contain spaces")
                .Matches(@"^[a-zA-Z0-9_]+$").WithMessage("UserName can only contain letters, numbers, and underscores");
            RuleFor(user => user.Email)
                .MaximumLength(255).WithMessage("Email Too Long")
                .EmailAddress().WithMessage("Must be a valid email address");
        }
    }
}
