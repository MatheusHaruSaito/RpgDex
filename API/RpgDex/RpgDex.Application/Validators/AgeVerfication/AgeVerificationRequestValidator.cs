using FluentValidation;
using RpgDex.Application.Dto.AgeVerification;
using RpgDex.Application.Helpers;
using RpgDex.Domain.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Validators.AgeVerfication
{
    public class AgeVerificationRequestValidator : AbstractValidator<AgeVerificationRequest>
    {
        public const int AdultAge = 18;

        public AgeVerificationRequestValidator()
        {
            RuleFor(x => x.BirthDate)
                .Must(d => d <= DateOnly.FromDateTime(DateTime.UtcNow))
                    .WithMessage("Birth date can't be in the future").WithErrorCode(ValidationErrorCodes.BirthDateFuture)
                .Must(d => d >= DateOnly.FromDateTime(DateTime.UtcNow).AddYears(-120))
                    .WithMessage("Invalid birth date").WithErrorCode(ValidationErrorCodes.BirthDateInvalid);

            RuleFor(x => x.Cpf)
                .NotEmpty().WithMessage("CPF can't be empty").WithErrorCode(ValidationErrorCodes.CpfEmpty)
                .Must(CpfValidator.IsValid).WithMessage("Invalid CPF").WithErrorCode(ValidationErrorCodes.CpfInvalid);

            // Regras do responsável: só valem para menores
            When(x => IsMinor(x.BirthDate), () =>
            {
                RuleFor(x => x.GuardianCpf)
                    .NotEmpty().WithMessage("Guardian CPF can't be empty").WithErrorCode(ValidationErrorCodes.GuardianCpfEmpty)
                    .Must(CpfValidator.IsValid).WithMessage("Invalid guardian CPF").WithErrorCode(ValidationErrorCodes.GuardianCpfInvalid)
                    .Must((req, g) => CpfValidator.Normalize(g) != CpfValidator.Normalize(req.Cpf))
                        .WithMessage("Guardian CPF must be different from the user's CPF")
                        .WithErrorCode(ValidationErrorCodes.GuardianCpfSameAsUser);

                RuleFor(x => x.GuardianEmail)
                    .NotEmpty().WithMessage("Guardian email can't be empty").WithErrorCode(ValidationErrorCodes.GuardianEmailEmpty)
                    .MaximumLength(255).WithMessage("Email Too Long").WithErrorCode(ValidationErrorCodes.GeneralMaxLength)
                    .EmailAddress().WithMessage("Must be a valid email address").WithErrorCode(ValidationErrorCodes.InvalidEmail);
            });
        }

        public static bool IsMinor(DateOnly birth) => CalculateAge(birth) < AdultAge;

        public static int CalculateAge(DateOnly birth)
        {
            var today = DateOnly.FromDateTime(DateTime.UtcNow);
            var age = today.Year - birth.Year;
            if (birth > today.AddYears(-age)) age--;
            return age;
        }
    }
}
