using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Helpers
{
    public static class CpfValidator
    {
        public static string Normalize(string? cpf) =>
            new string((cpf ?? "").Where(char.IsDigit).ToArray());

        public static bool IsValid(string? cpf)
        {
            var d = Normalize(cpf);
            if (d.Length != 11 || d.Distinct().Count() == 1) return false;

            int Digit(int len)
            {
                var sum = 0;
                for (int i = 0; i < len; i++) sum += (d[i] - '0') * (len + 1 - i);
                var r = sum * 10 % 11;
                return r == 10 ? 0 : r;
            }

            return Digit(9) == d[9] - '0' && Digit(10) == d[10] - '0';
        }
    }
}
