using FluentValidation;
using RpgDex.Application.Dto.Canvas;
using RpgDex.Domain.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Validators.Canvas
{
    public class SetElementActiveStateRequestValidator : AbstractValidator<SetElementActiveStateRequest>
    {
        public SetElementActiveStateRequestValidator()
        {
            RuleFor(r => r.CampaignId)
                .NotEmpty().WithMessage("CampaignId can't be empty").WithErrorCode(ValidationErrorCodes.GeneralEmpty);

            RuleFor(r => r.Ids)
                .Cascade(CascadeMode.Stop)
                .NotNull().WithMessage("Ids can't be empty").WithErrorCode(ValidationErrorCodes.GeneralEmpty)
                .Must(i => i.Count > 0 && i.Count <= CanvasLimits.MaxItemsPerRequest)
                    .WithMessage($"Ids must have between 1 and {CanvasLimits.MaxItemsPerRequest} elements")
                    .WithErrorCode(ValidationErrorCodes.CanvasTooManyItems);

            RuleForEach(r => r.Ids)
                .NotEmpty().WithMessage("Id can't be empty").WithErrorCode(ValidationErrorCodes.GeneralEmpty);
        }
    }
}
