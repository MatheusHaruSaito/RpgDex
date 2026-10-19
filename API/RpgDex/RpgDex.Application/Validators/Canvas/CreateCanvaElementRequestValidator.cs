using FluentValidation;
using RpgDex.Application.Dto.Canvas;
using RpgDex.Domain.Common;
using RpgDex.Domain.Entities;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Validators.Canvas
{
    public class CreateCanvaElementRequestValidator : AbstractValidator<CreateCanvaElementRequest>
    {
        public CreateCanvaElementRequestValidator()
        {
            RuleFor(e => e.CampaignId)
                .NotEmpty().WithMessage("CampaignId can't be empty").WithErrorCode(ValidationErrorCodes.GeneralEmpty);

            RuleFor(e => e.ElementType)
                .IsInEnum().WithMessage("Invalid element type").WithErrorCode(ValidationErrorCodes.CanvasInvalidType);

            RuleFor(e => e.X).ValidCoordinate("X");
            RuleFor(e => e.Y).ValidCoordinate("Y");

            RuleFor(e => e.Z)
                .InclusiveBetween(-1_000_000, 1_000_000)
                .WithMessage("Z is out of range").WithErrorCode(ValidationErrorCodes.CanvasInvalidValue);

            RuleFor(e => e.Scale).ValidScale();

            RuleFor(e => e.Color).ValidColor().When(e => e.Color is not null);

            When(e => e.ElementType is CanvaElementType.Token or CanvaElementType.Text, () =>
            {
                RuleFor(e => e.Content)
                    .Cascade(CascadeMode.Stop)
                    .NotEmpty().WithMessage("Content can't be empty").WithErrorCode(ValidationErrorCodes.GeneralEmpty)
                    .MaximumLength(CanvasLimits.MaxContentLength)
                        .WithMessage($"Content can't exceed {CanvasLimits.MaxContentLength} characters")
                        .WithErrorCode(ValidationErrorCodes.GeneralMaxLength);
            });

            When(e => e.ElementType == CanvaElementType.Image, () =>
            {
                RuleFor(e => e.Image)
                    .Cascade(CascadeMode.Stop)
                    .Must(f => f!.Length > 0)
                        .WithMessage("Image can't be empty").WithErrorCode(ValidationErrorCodes.CanvasInvalidImage)
                    .Must(f => CanvasLimits.AllowedImageExtensions.Contains(Path.GetExtension(f!.FileName).ToLowerInvariant()))
                        .WithMessage("Image must be a JPG, JPEG, PNG or WEBP file").WithErrorCode(ValidationErrorCodes.InvalidFileExtension)
                    .Must(f => f!.Length <= CanvasLimits.MaxImageBytes)
                        .WithMessage("Image file size must not exceed 5MB").WithErrorCode(ValidationErrorCodes.FileTooLarge)
                    .When(e => e.Image is not null);
            });

            When(e => e.ElementType == CanvaElementType.Drawing, () =>
            {
                RuleFor(e => e.Points)
                    .Cascade(CascadeMode.Stop)
                    .NotNull().WithMessage("Drawing must have points").WithErrorCode(ValidationErrorCodes.CanvasInvalidPoints)
                    .ValidPoints();

                RuleFor(e => e.StrokeWidth)
                    .Cascade(CascadeMode.Stop)
                    .NotNull().WithMessage("Stroke width is required").WithErrorCode(ValidationErrorCodes.CanvasInvalidValue)
                    .Must(w => w > 0 && w <= CanvasLimits.MaxStrokeWidth)
                        .WithMessage($"Stroke width must be between 0 and {CanvasLimits.MaxStrokeWidth}")
                        .WithErrorCode(ValidationErrorCodes.CanvasInvalidValue);
            });
        }
    }
}
