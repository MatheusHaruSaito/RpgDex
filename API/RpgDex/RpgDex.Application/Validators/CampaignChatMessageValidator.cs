using FluentValidation;
using RpgDex.Application.Dto;
using RpgDex.Domain.Common;
using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Application.Validators
{
    public class CampaignChatMessageValidator : AbstractValidator<CampaignChatMessageRequest>
    {
        public CampaignChatMessageValidator()
        {
            RuleFor(chat => chat.Message)
                .NotNull().NotEmpty().WithMessage("Message can't be empty").WithErrorCode(ValidationErrorCodes.GeneralEmpty)
                .MaximumLength(500).WithMessage("Message can't exceed 500 characters").WithErrorCode(ValidationErrorCodes.GeneralMaxLength);
        }
    }
}
