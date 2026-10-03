using FluentValidation;
using RpgDex.Application.Dto;
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
                .NotNull().WithMessage("Message can't be empty")
                .MaximumLength(500).WithMessage("Message can't exceed 60 digits");
                
        }
    }
}
