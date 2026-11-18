using FluentValidation;
using RpgDex.Domain.Common;
using RpgDex.Domain.ValueObjects;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Validators.Canvas
{
    public static class CanvasRuleExtensions
    {
        public static IRuleBuilderOptions<T, double> ValidCoordinate<T>(this IRuleBuilder<T, double> rule, string name) =>
            rule.Must(v => double.IsFinite(v) && Math.Abs(v) <= CanvasLimits.MaxCoordinate)
                .WithMessage($"{name} is out of range")
                .WithErrorCode(ValidationErrorCodes.CanvasInvalidValue);

        public static IRuleBuilderOptions<T, double> ValidScale<T>(this IRuleBuilder<T, double> rule) =>
            rule.Must(v => double.IsFinite(v) && v >= CanvasLimits.MinScale && v <= CanvasLimits.MaxScale)
                .WithMessage($"Scale must be between {CanvasLimits.MinScale} and {CanvasLimits.MaxScale}")
                .WithErrorCode(ValidationErrorCodes.CanvasInvalidValue);

        public static IRuleBuilderOptions<T, string?> ValidColor<T>(this IRuleBuilder<T, string?> rule) =>
            rule.Matches(@"^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$")
                .WithMessage("Color must be a hex value like #9E74D0")
                .WithErrorCode(ValidationErrorCodes.CanvasInvalidColor);

        public static IRuleBuilderOptions<T, List<CanvasPoint>?> ValidPoints<T>(this IRuleBuilder<T, List<CanvasPoint>?> rule) =>
            rule.Must(p => p is not null && p.Count > 0 && p.Count <= CanvasLimits.MaxPoints)
                    .WithMessage($"Drawing must have between 1 and {CanvasLimits.MaxPoints} points")
                    .WithErrorCode(ValidationErrorCodes.CanvasInvalidPoints)
                .Must(p => p is not null && p.All(pt =>
                        double.IsFinite(pt.X) && double.IsFinite(pt.Y) &&
                        Math.Abs(pt.X) <= CanvasLimits.MaxCoordinate &&
                        Math.Abs(pt.Y) <= CanvasLimits.MaxCoordinate))
                    .WithMessage("Drawing has invalid points")
                    .WithErrorCode(ValidationErrorCodes.CanvasInvalidPoints);
    }
}
