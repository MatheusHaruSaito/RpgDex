using Microsoft.AspNetCore.Mvc;

namespace RpgDex.WebApi.Filters
{
    public class EarlyAccessAttribute : TypeFilterAttribute
    {
        public EarlyAccessAttribute() : base(typeof(EarlyAccessFilter)) { }
    }
}
