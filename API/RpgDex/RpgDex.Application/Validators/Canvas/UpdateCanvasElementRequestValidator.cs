using FluentValidation;
using RpgDex.Application.Dto.Canvas;
using RpgDex.Domain.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Validators.Canvas
{
        public class UpdateCanvasElementRequestValidator : AbstractValidator<UpdateCanvasElementRequest>
        {
            public UpdateCanvasElementRequestValidator()
            {
            RuleFor(e => e.Id)
                .NotEmpty().WithMessage("Id can't be empty").WithErrorCode(ValidationErrorCodes.GeneralEmpty);
            RuleFor(e => e.CampaignId)
                .NotEmpty().WithMessage("CampaignId can't be empty").WithErrorCode(ValidationErrorCodes.GeneralEmpty);

            RuleFor(e => e.Scale).ValidScale();

            RuleFor(e => e.Content)
                .MaximumLength(CanvasLimits.MaxContentLength)
                .WithMessage($"Content can't exceed {CanvasLimits.MaxContentLength} characters")
                .WithErrorCode(ValidationErrorCodes.GeneralMaxLength);

            RuleFor(e => e.Color).ValidColor().When(e => e.Color is not null);

            RuleFor(e => e.Image)
                .Cascade(CascadeMode.Stop)
                .Must(f => f!.Length > 0)
                    .WithMessage("Image can't be empty").WithErrorCode(ValidationErrorCodes.CanvasInvalidImage)
                .Must(f => CanvasLimits.AllowedImageExtensions.Contains(Path.GetExtension(f!.FileName).ToLowerInvariant()))
                    .WithMessage("Image must be a JPG, JPEG, PNG or WEBP file").WithErrorCode(ValidationErrorCodes.InvalidFileExtension)
                .Must(f => f!.Length <= CanvasLimits.MaxImageBytes)
                    .WithMessage("Image file size must not exceed 5MB").WithErrorCode(ValidationErrorCodes.FileTooLarge)
                .When(e => e.Image is not null);

            RuleFor(e => e.Points).ValidPoints().When(e => e.Points is not null);

            RuleFor(e => e.StrokeWidth)
                .Must(w => w > 0 && w <= CanvasLimits.MaxStrokeWidth)
                .WithMessage($"Stroke width must be between 0 and {CanvasLimits.MaxStrokeWidth}")
                .WithErrorCode(ValidationErrorCodes.CanvasInvalidValue)
                .When(e => e.StrokeWidth is not null);
        }
        }
    }
