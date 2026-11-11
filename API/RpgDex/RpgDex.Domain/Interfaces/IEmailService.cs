using System;
using System.Collections.Generic;
using System.Text;

namespace RpgDex.Domain.Interfaces
{
    public interface IEmailService
    {
        Task<(bool isEmailSent, string message)> SendEmailAsync(string receiverEmail, string receiverName, string subject, string htmlbody);
        string GenerateEmailVerificationHTMLTemplate(string verificationLink, string userName);
        string GenerateTwoFactorEmailHTMLTemplate(string twoFactorCode, string userName);
        string GeneratePasswordResetHTMLTemplate(string resetLink, string userName);
        string GeneratePasswordResetConfirmationHTMLTemplate(string userName);
    }
}
