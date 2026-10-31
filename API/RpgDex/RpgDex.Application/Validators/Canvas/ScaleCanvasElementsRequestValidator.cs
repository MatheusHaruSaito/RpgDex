using FluentValidation;
using RpgDex.Application.Dto.Canvas;
using RpgDex.Domain.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Validators.Canvas
{
    public class ScaleCanvasElementsRequestValidator : AbstractValidator<ScaleCanvasElementsRequest>
    {
        public ScaleCanvasElementsRequestValidator()
        {
            RuleFor(x => x.CampaignId)
                .NotEmpty()
                .WithMessage("CampaignId is required")
                .WithErrorCode(ValidationErrorCodes.GeneralEmpty);

            RuleFor(x => x.Items)
                .Cascade(CascadeMode.Stop)
                .NotNull()
                    .WithMessage("Items is required")
                    .WithErrorCode(ValidationErrorCodes.GeneralEmpty)
                .Must(i => i.Count > 0)
                    .WithMessage("Items must not be empty")
                    .WithErrorCode(ValidationErrorCodes.CanvasEmptyItems)
                .Must(i => i.Count <= CanvasLimits.MaxItemsPerRequest)
                    .WithMessage($"Items must contain at most {CanvasLimits.MaxItemsPerRequest} elements")
                    .WithErrorCode(ValidationErrorCodes.CanvasTooManyItems)
                .Must(i => i.Select(e => e.Id).Distinct().Count() == i.Count)
                    .WithMessage("Items contains duplicated element ids")
                    .WithErrorCode(ValidationErrorCodes.CanvasDuplicatedItems);
        }
    }
}
