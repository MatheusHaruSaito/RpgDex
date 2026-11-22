using FluentValidation;
using RpgDex.Application.Dto.Canvas;
using RpgDex.Domain.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Validators.Canvas
{
    public class ChangeColorCanvaElementsRequestValidator : AbstractValidator<ChangeColorCanvasElementsRequest>
    {
        public ChangeColorCanvaElementsRequestValidator()
        {
            RuleFor(e => e.CampaignId)
                .NotEmpty().WithMessage("CampaignId can't be empty").WithErrorCode(ValidationErrorCodes.GeneralEmpty);

            RuleFor(e => e.Ids)
                .Cascade(CascadeMode.Stop)
                .NotEmpty().WithMessage("Ids can't be empty").WithErrorCode(ValidationErrorCodes.CanvasEmptyItems)
                .Must(ids => ids.Count <= CanvasLimits.MaxItemsPerRequest)
                    .WithMessage($"Ids can't exceed {CanvasLimits.MaxItemsPerRequest} per request")
                    .WithErrorCode(ValidationErrorCodes.CanvasTooManyItems)
                .Must(ids => ids.Distinct().Count() == ids.Count)
                    .WithMessage("Ids can't contain duplicated elements")
                    .WithErrorCode(ValidationErrorCodes.CanvasDuplicatedItems);

            RuleForEach(e => e.Ids)
                .NotEmpty().WithMessage("Element Id can't be empty").WithErrorCode(ValidationErrorCodes.GeneralEmpty);

            RuleFor(e => e.Color)
                .Cascade(CascadeMode.Stop)
                .NotEmpty().WithMessage("Color can't be empty").WithErrorCode(ValidationErrorCodes.GeneralEmpty)
                .ValidColor();
        }
    }
}
