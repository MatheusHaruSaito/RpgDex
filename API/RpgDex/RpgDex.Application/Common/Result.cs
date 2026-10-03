using System;

namespace RpgDex.Application.Common
{
    public class Result<T>
    {
        public T? Value { get;}
        public Error Error { get;}
        public bool IsSuccess { get;}
        public bool IsFailure => !IsSuccess;

        public Result(bool IsSuccess, T? Value, Error Error)
        {
            this.IsSuccess = IsSuccess;
            this.Value = Value; 
            this.Error = Error;
        }

        public static Result<T> Success(T Value) => new Result<T>(true, Value, Error.None);
        public static Result<T> Failure(Error Error) => new Result<T>(false, default, Error);
    }

   
}
