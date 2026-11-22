using FluentValidation;
using RpgDex.Application.Dto.Canvas;
using RpgDex.Domain.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Validators.Canvas
{
    public class UpdateElementContentRequestValidator : AbstractValidator<UpdateElementContentRequest>
    {
        public UpdateElementContentRequestValidator()
        {
            RuleFor(e => e.CampaignId)
                .NotEmpty().WithMessage("CampaignId can't be empty").WithErrorCode(ValidationErrorCodes.GeneralEmpty);

            RuleFor(e => e.ElementId)
                .NotEmpty().WithMessage("ElementId can't be empty").WithErrorCode(ValidationErrorCodes.GeneralEmpty);

            RuleFor(e => e.Content)
                .Cascade(CascadeMode.Stop)
                .NotEmpty().WithMessage("Content can't be empty").WithErrorCode(ValidationErrorCodes.GeneralEmpty)
                .MaximumLength(CanvasLimits.MaxContentLength)
                    .WithMessage($"Content can't exceed {CanvasLimits.MaxContentLength} characters")
                    .WithErrorCode(ValidationErrorCodes.GeneralMaxLength);
        }
    }
}
