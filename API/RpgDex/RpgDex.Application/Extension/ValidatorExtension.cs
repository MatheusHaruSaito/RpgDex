using FluentValidation.Results;
using RpgDex.Domain.Common;

namespace RpgDex.Application.Extension
{
    public static class ValidatorExtension
    {
        //Refactor this later
        public static Result<T> ReturnErrors<T>(this ValidationResult result)
        {
            var errors = result.Errors
                .Select(e => new Error($"VALIDATION_{e.PropertyName.ToUpper()}", e.ErrorMessage))
                .ToList();
            return Result<T>.Failure(errors);
        }
    }
}
