using System;
using static System.Runtime.InteropServices.JavaScript.JSType;

namespace RpgDex.Application.Common
{
    public class Result<T>
    {
        public T? Value { get;}
        public IReadOnlyCollection<Error> Errors { get;}
        public bool IsSuccess { get;}
        public bool IsFailure => !IsSuccess;

        public Result(bool isSuccess, T? value, IReadOnlyCollection<Error>? errors = null)
        {
            this.IsSuccess = isSuccess;
            this.Value = value;
            this.Errors = errors?.ToList().AsReadOnly() ?? new List<Error>().AsReadOnly();
        }

        public static Result<T> Success(T Value) => new Result<T>(true, Value);
        public static Result<T> Failure(Error error) => new Result<T>(false, default, new[] { error });
        public static Result<T> Failure(IReadOnlyCollection<Error> errors) => new Result<T>(false, default, errors);
    }

   
}
