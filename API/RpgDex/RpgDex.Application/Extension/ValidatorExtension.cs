using FluentValidation.Results;
using RpgDex.Application.Common;
using System;
using System.Collections.Generic;
using System.Text;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace RpgDex.Application.Extension
{
    public static class ValidatorExtension
    {
        //Refactor this later
        public static Result<T> ReturnErrors<T>(this ValidationResult result)
        {
            var errors = result.Errors
                .Select(e => new Common.Error($"VALIDATION_{e.PropertyName.ToUpper()}", e.ErrorMessage))
                .ToList();
            return Result<T>.Failure(errors);
        }
    }
}
