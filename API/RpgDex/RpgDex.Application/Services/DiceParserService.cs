using System;
using System.Collections.Generic;
using System.Globalization;
using System.Text;
using System.Text.RegularExpressions;

namespace RpgDex.Application.Services
{
    public sealed record DiceEvaluation(double Total, List<int> Rolls, string Breakdown);
    public class DiceParserService
    {
        private const int MaxDice = 100;
        private const int MaxSides = 2500;
        private const int MaxLength = 100;
        private const int MaxRepeat = 20;
        private static readonly Regex TokenRegex = new(
            @"\d*d\d+|\d+(?:\.\d+)?|[-+*/()]",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

        public static bool TryEvaluate(string? expression, out List<DiceEvaluation> result)
        {
            result = new();
            if (string.IsNullOrWhiteSpace(expression)) return false;

            var src = Regex.Replace(expression, @"\s+", "").ToLowerInvariant();
            if (src.Length > MaxLength) return false;

            var repeat = 1;
            var hashIndex = src.IndexOf('#');
            var prefix = src[..hashIndex];
            if (hashIndex >= 0)
            {
                if (prefix!= "" && !int.TryParse(prefix, NumberStyles.None, CultureInfo.InvariantCulture, out repeat) || repeat < 1 || repeat > MaxRepeat) return false;


                src = src[(hashIndex + 1)..];
                if (src.Contains('#'))return false;
            }

            var tokens = TokenRegex.Matches(src).Select(m => m.Value).ToList();
            if (tokens.Count == 0 || string.Concat(tokens) != src) return false;

            try
            {
                for (var i = 0; i < repeat; i++)
                {
                    result.Add(new Evaluator(tokens).Run());
                    if (result.Sum(r => r.Rolls.Count) > MaxDice) { result.Clear(); return false; }
                }

                return true;
            }
            catch (Exception e) when (e is FormatException or OverflowException
                                        or InvalidOperationException or DivideByZeroException)
            {
                result.Clear();
                return false;
            }
        }

        private sealed class Evaluator(List<string> tokens)
        {
            private int _pos;
            private readonly List<int> _rolls = new();
            private readonly StringBuilder _breakdown = new();

            public DiceEvaluation Run()
            {
                var value = ParseExpr();
                if (_pos < tokens.Count) throw new InvalidOperationException();

                var floored = Math.Floor(value);
                if (Math.Abs(value) > 1_000_000_000m) throw new OverflowException();

                return new DiceEvaluation((double)value, _rolls, _breakdown.ToString());
            }

            private string? Peek() => _pos < tokens.Count ? tokens[_pos] : null;
            private string Next() => _pos < tokens.Count ? tokens[_pos++] : throw new InvalidOperationException();

            private decimal ParseExpr()
            {
                var value = ParseTerm();
                while (Peek() is "+" or "-")
                {
                    var op = Next();
                    _breakdown.Append(op);
                    var right = ParseTerm();
                    value = op == "+" ? value + right : value - right;
                }
                return value;
            }

            private decimal ParseTerm()
            {
                var value = ParseFactor();
                while (Peek() is "*" or "/")
                {
                    var op = Next();
                    _breakdown.Append(op);
                    var right = ParseFactor();
                    value = op == "*" ? value * right : value / right;
                }
                return value;
            }

            private decimal ParseFactor()
            {
                var token = Next();

                if (token == "-")
                {
                    _breakdown.Append('-');
                    return -ParseFactor();
                }

                if (token == "(")
                {
                    _breakdown.Append('(');
                    var inner = ParseExpr();
                    if (Next() != ")") throw new InvalidOperationException();
                    _breakdown.Append(')');
                    return inner;
                }



                if (token.Contains('d'))
                {
                    var parts = token.Split('d');
                    var count = parts[0] == "" ? 1 : int.Parse(parts[0], CultureInfo.InvariantCulture);
                    var sides = int.Parse(parts[1], CultureInfo.InvariantCulture);

                    if (count < 1 || sides < 1 || sides > MaxSides || _rolls.Count + count > MaxDice)
                        throw new InvalidOperationException();

                    var thrown = Enumerable.Range(0, count)
                        .Select(_ => Random.Shared.Next(1, sides + 1))
                        .ToList();

                    _rolls.AddRange(thrown);
                    _breakdown.Append('[').Append(string.Join(", ", thrown)).Append(']');
                    return thrown.Sum();
                }
                   

                _breakdown.Append(token);
                return decimal.Parse(token, CultureInfo.InvariantCulture);
            }
        }
    }
}
