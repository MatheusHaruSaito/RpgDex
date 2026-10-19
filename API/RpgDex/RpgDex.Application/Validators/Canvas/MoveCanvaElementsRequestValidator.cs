using FluentValidation;
using RpgDex.Application.Dto;
using RpgDex.Domain.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Validators.Canvas
{
    public class MoveCanvaElementsRequestValidator : AbstractValidator<MoveCanvaElementsRequest>
    {
        public MoveCanvaElementsRequestValidator()
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
                item.RuleFor(i => i.X).ValidCoordinate("X");
                item.RuleFor(i => i.Y).ValidCoordinate("Y");
            });
        }
    }
}
