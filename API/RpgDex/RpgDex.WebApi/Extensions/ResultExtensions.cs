using Microsoft.AspNetCore.Mvc;
using RpgDex.Application.Common;

namespace RpgDex.WebApi.Extensions
{
    //essa classe é responsável por converter o resultado do serviço em um IActionResult para ser retornado na API
    public static class ResultExtensions
    {
        public static IActionResult ToIActionResult<T>(this Result<T> result)
        {
            if (result.IsFailure)
            {
                return new BadRequestObjectResult(new
                {
                    success = result.IsSuccess,
                    message = result.Errors,
                    data = result.Value
                });
            }

            return new OkObjectResult(new
            {
                success = result.IsSuccess,
                data = result.Value
            });
        }
    }
}
