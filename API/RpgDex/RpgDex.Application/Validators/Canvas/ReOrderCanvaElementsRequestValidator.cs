using FluentValidation;
using RpgDex.Application.Dto.Canvas;
using RpgDex.Domain.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Validators.Canvas
{
    public class ReOrderCanvaElementsRequestValidator : AbstractValidator<ReOrderCanvaElementsRequest>
    {
        public ReOrderCanvaElementsRequestValidator()
        {
            RuleFor(r => r.CampaignId).NotEmpty().WithMessage("CampaignId can't be empty").WithErrorCode(ValidationErrorCodes.GeneralEmpty);

            RuleFor(r => r.Items)
                .Cascade(CascadeMode.Stop)
                .NotNull().WithMessage("Items can't be empty").WithErrorCode(ValidationErrorCodes.GeneralEmpty)
                .Must(i => i.Count > 0 && i.Count <= CanvasLimits.MaxItemsPerRequest)
                    .WithMessage($"Items must have between 1 and {CanvasLimits.MaxItemsPerRequest} elements")
                    .WithErrorCode(ValidationErrorCodes.CanvasTooManyItems);

            RuleForEach(r => r.Items).ChildRules(item =>
            {
                item.RuleFor(i => i.Id).NotEmpty().WithErrorCode(ValidationErrorCodes.GeneralEmpty);
                item.RuleFor(i => i.Z)
                    .InclusiveBetween(-1_000_000, 1_000_000)
                    .WithMessage("Z is out of range").WithErrorCode(ValidationErrorCodes.CanvasInvalidValue);
            });
        }
    }
}
