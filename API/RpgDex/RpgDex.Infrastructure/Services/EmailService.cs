using Microsoft.Extensions.Options;
using Resend;
using RpgDex.Domain.Interfaces;
using RpgDex.Infrastructure.Settings;

namespace RpgDex.Infrastructure.Services
{
  public class EmailService : IEmailService
  {
    private readonly EmailSettings _settings;
    private readonly ApiSettings _apiSettings;

    private readonly IResend _resend;
    public EmailService(IOptions<EmailSettings> options, IOptions<ApiSettings> apiSettings, IResend resend)
    {
      _settings = options.Value;
      _apiSettings = apiSettings.Value;
      _resend = resend;
    }

    public async Task<(bool isEmailSent, string message)> SendEmailAsync(string receiverEmail, string receiverName, string subject, string htmlBody)
    {
      //Resend
      try
      {
        var message = new EmailMessage();
        message.From = $"RpgDex <{_settings.Username}>";
        message.To.Add(receiverEmail);
        message.Subject = subject;
        message.HtmlBody = htmlBody;

        var response = await _resend.EmailSendAsync(message);

        if (response.Success)
        {
          return (true, "Email sent successfully.");
        }

        return (false, "Error sending email via Resend.");
      }
      catch (Exception ex)
      {
        return (false, "Error sending email: " + ex.Message);
      }

    }

    public string GenerateEmailVerificationHTMLTemplate(string verificationLink, string userName)
    {

      return $@"<!DOCTYPE html>
                <html lang=""pt-BR"">
                <head>
                  <meta charset=""UTF-8"">
                  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
                  <title>Confirme seu email — RPGDex</title>
                </head>
                <body style=""margin:0;padding:0;background-color:#f4f2fb;font-family:'Segoe UI',Arial,sans-serif;"">

                  <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#f4f2fb;padding:40px 20px;"">
                    <tr>
                      <td align=""center"">
                        <table width=""100%"" cellpadding=""0"" cellspacing=""0""
                               style=""max-width:520px;background:#ffffff;border-radius:20px;
                                       box-shadow:0 8px 40px rgba(100,60,200,0.12);overflow:hidden;"">

                          <!-- Header gradiente -->
                          <tr>
                            <td style=""background:linear-gradient(135deg,#7c3aed,#a855f7);
                                        padding:40px 40px 32px;text-align:center;"">
                              <p style=""margin:0;font-family:'Segoe UI',Arial,sans-serif;
                                         font-weight:900;font-size:2rem;color:#ffffff;
                                         letter-spacing:-1px;"">RPGDex</p>
                              <p style=""margin:10px 0 0;font-size:0.9rem;color:rgba(255,255,255,0.8);"">
                                Sua plataforma de campanhas e fichas
                              </p>
                            </td>
                          </tr>

                          <!-- Corpo -->
                          <tr>
                            <td style=""padding:40px 40px 32px;"">

                              <!-- Ícone -->
                              <div style=""text-align:center;margin-bottom:24px;"">
                                <div style=""display:inline-block;width:72px;height:72px;
                                             border-radius:50%;background:#f3eeff;
                                             border:3px solid #7c3aed;line-height:72px;
                                             font-size:2rem;color:#7c3aed;text-align:center;"">
                                  ✉
                                </div>
                              </div>

                              <h1 style=""margin:0 0 8px;font-size:1.5rem;font-weight:800;
                                          color:#1a1033;text-align:center;"">
                                Confirme seu email
                              </h1>
                              <p style=""margin:0 0 24px;font-size:1rem;color:#555;
                                         text-align:center;line-height:1.6;"">
                                Olá, <strong style=""color:#7c3aed;"">{userName}</strong>!<br>
                                Clique no botão abaixo para confirmar seu endereço de email
                                e ativar sua conta no RPGDex.
                              </p>

                              <!-- Botão CTA -->
                              <div style=""text-align:center;margin:32px 0;"">
                                <a href=""{_apiSettings.UIBaseUrl}{verificationLink}""
                                   style=""display:inline-block;padding:16px 40px;
                                           background:linear-gradient(135deg,#7c3aed,#a855f7);
                                           color:#ffffff;font-size:1rem;font-weight:800;
                                           text-decoration:none;border-radius:10px;
                                           letter-spacing:0.04em;text-transform:uppercase;
                                           box-shadow:0 4px 18px rgba(124,58,237,0.4);"">
                                  Verificar email
                                </a>
                              </div>

                              <!-- Aviso de expiração -->
                              <p style=""margin:0 0 20px;font-size:0.85rem;color:#888;
                                         text-align:center;line-height:1.5;"">
                                Este link expirará em <strong>24 horas</strong>.<br>
                                Se você não criou uma conta no RPGDex, ignore este email.
                              </p>

                              <!-- Link alternativo -->
                              <div style=""background:#f8f6ff;border:1px solid #e5dff8;
                                           border-radius:10px;padding:14px 16px;"">
                                <p style=""margin:0 0 6px;font-size:0.78rem;font-weight:700;
                                           color:#7c3aed;text-transform:uppercase;
                                           letter-spacing:0.06em;"">
                                  Link não funciona?
                                </p>
                                <p style=""margin:0;font-size:0.8rem;color:#666;
                                           word-break:break-all;line-height:1.5;"">
                                  Copie e cole o endereço abaixo no seu navegador:<br>
                                  <span style=""color:#7c3aed;"">{_apiSettings.UIBaseUrl}{verificationLink}</span>
                                </p>
                              </div>

                            </td>
                          </tr>

                          <!-- Footer -->
                          <tr>
                            <td style=""background:#f8f6ff;padding:20px 40px;text-align:center;
                                        border-top:1px solid #ede9f8;"">
                              <p style=""margin:0;font-size:0.8rem;color:#aaa;line-height:1.6;"">
                                © {DateTime.UtcNow.Year} RPGDex · Este é um email automático, não responda.<br>
                              </p>
                            </td>
                          </tr>

                        </table>
                      </td>
                    </tr>
                  </table>

                </body>
                </html>";
    }

    public string GenerateTwoFactorEmailHTMLTemplate(string twoFactorCode, string userName)
    {
      return $@"<!DOCTYPE html>
                <html lang=""pt-BR"">
                <head>
                  <meta charset=""UTF-8"">
                  <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
                  <title>Código de Segurança 2FA — RPGDex</title>
                </head>
                <body style=""margin:0;padding:0;background-color:#f4f2fb;font-family:'Segoe UI',Arial,sans-serif;"">

                  <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#f4f2fb;padding:40px 20px;"">
                    <tr>
                      <td align=""center"">
                        <table width=""100%"" cellpadding=""0"" cellspacing=""0""
                               style=""max-width:520px;background:#ffffff;border-radius:20px;
                                       box-shadow:0 8px 40px rgba(100,60,200,0.12);overflow:hidden;"">

                          <!-- Header gradiente -->
                          <tr>
                            <td style=""background:linear-gradient(135deg,#7c3aed,#a855f7);
                                        padding:40px 40px 32px;text-align:center;"">
                              <p style=""margin:0;font-family:'Segoe UI',Arial,sans-serif;
                                         font-weight:900;font-size:2rem;color:#ffffff;
                                         letter-spacing:-1px;"">RPGDex</p>
                              <p style=""margin:10px 0 0;font-size:0.9rem;color:rgba(255,255,255,0.8);"">
                                Sua plataforma de campanhas e fichas
                              </p>
                            </td>
                          </tr>

                          <!-- Corpo -->
                          <tr>
                            <td style=""padding:40px 40px 32px;"">

                              <!-- Ícone de Escudo/Segurança -->
                              <div style=""text-align:center;margin-bottom:24px;"">
                                <div style=""display:inline-block;width:72px;height:72px;
                                             border-radius:50%;background:#f3eeff;
                                             border:3px solid #7c3aed;line-height:72px;
                                             font-size:2rem;color:#7c3aed;text-align:center;"">
                                  🛡️
                                </div>
                              </div>

                              <h1 style=""margin:0 0 8px;font-size:1.5rem;font-weight:800;
                                          color:#1a1033;text-align:center;"">
                                Código de Verificação
                              </h1>
                              <p style=""margin:0 0 24px;font-size:1rem;color:#555;
                                         text-align:center;line-height:1.6;"">
                                Olá, <strong style=""color:#7c3aed;"">{userName}</strong>!<br>
                                Utilize o código abaixo para confirmar a ativação do 2FA ou realizar o seu acesso no RPGDex:
                              </p>

                              <!-- Caixa Destaque do Código -->
                              <div style=""text-align:center;margin:32px 0;"">
                                <div style=""display:inline-block;padding:16px 36px;
                                            background:#f8f6ff;border:2px dashed #7c3aed;
                                            border-radius:12px;"">
                                  <span style=""font-family:monospace,'Courier New',Courier;
                                               font-size:2.2rem;font-weight:900;
                                               color:#7c3aed;letter-spacing:8px;"">
                                    {twoFactorCode}
                                  </span>
                                </div>
                              </div>

                              <!-- Aviso de Segurança/Expiração -->
                              <p style=""margin:0 0 20px;font-size:0.85rem;color:#888;
                                         text-align:center;line-height:1.5;"">
                                Se você não solicitou este código, por favor ignore este e-mail.
                              </p>

                            </td>
                          </tr>

                          <!-- Footer -->
                          <tr>
                            <td style=""background:#f8f6ff;padding:20px 40px;text-align:center;
                                        border-top:1px solid #ede9f8;"">
                              <p style=""margin:0;font-size:0.8rem;color:#aaa;line-height:1.6;"">
                                © {DateTime.UtcNow.Year} RPGDex · Este é um email automático, não responda.<br>
                              </p>
                            </td>
                          </tr>

                        </table>
                      </td>
                    </tr>
                  </table>

                </body>
                </html>";
    }
    public string GeneratePasswordResetHTMLTemplate(string resetLink, string userName)
    {
      return $@"<!DOCTYPE html>
        <html lang=""pt-BR"">
        <head>
          <meta charset=""UTF-8"">
          <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
          <title>Redefinição de Senha — RPGDex</title>
        </head>
        <body style=""margin:0;padding:0;background-color:#f4f2fb;font-family:'Segoe UI',Arial,sans-serif;"">

          <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#f4f2fb;padding:40px 20px;"">
            <tr>
              <td align=""center"">
                <table width=""100%"" cellpadding=""0"" cellspacing=""0""
                       style=""max-width:520px;background:#ffffff;border-radius:20px;
                               box-shadow:0 8px 40px rgba(100,60,200,0.12);overflow:hidden;"">

                  <!-- Header gradiente -->
                  <tr>
                    <td style=""background:linear-gradient(135deg,#7c3aed,#a855f7);
                                padding:40px 40px 32px;text-align:center;"">
                      <p style=""margin:0;font-family:'Segoe UI',Arial,sans-serif;
                                 font-weight:900;font-size:2rem;color:#ffffff;
                                 letter-spacing:-1px;"">RPGDex</p>
                      <p style=""margin:10px 0 0;font-size:0.9rem;color:rgba(255,255,255,0.8);"">
                        Sua plataforma de campanhas e fichas
                      </p>
                    </td>
                  </tr>

                  <!-- Corpo -->
                  <tr>
                    <td style=""padding:40px 40px 32px;"">

                      <!-- Ícone -->
                      <div style=""text-align:center;margin-bottom:24px;"">
                        <div style=""display:inline-block;width:72px;height:72px;
                                     border-radius:50%;background:#f3eeff;
                                     border:3px solid #7c3aed;line-height:72px;
                                     font-size:2rem;color:#7c3aed;text-align:center;"">
                          🔑
                        </div>
                      </div>

                      <h1 style=""margin:0 0 8px;font-size:1.5rem;font-weight:800;
                                  color:#1a1033;text-align:center;"">
                        Criar ou Redefinir Senha
                      </h1>
                      <p style=""margin:0 0 24px;font-size:1rem;color:#555;
                                 text-align:center;line-height:1.6;"">
                        Olá, <strong style=""color:#7c3aed;"">{userName}</strong>!<br>
                        Recebemos uma solicitação para cadastrar ou alterar a sua senha de acesso no RPGDex. Clique no botão abaixo para definir sua nova senha.
                      </p>

                      <!-- Botão CTA -->
                      <div style=""text-align:center;margin:32px 0;"">
                        <a href=""{_apiSettings.UIBaseUrl}{resetLink}""
                           style=""display:inline-block;padding:16px 40px;
                                   background:linear-gradient(135deg,#7c3aed,#a855f7);
                                   color:#ffffff;font-size:1rem;font-weight:800;
                                   text-decoration:none;border-radius:10px;
                                   letter-spacing:0.04em;text-transform:uppercase;
                                   box-shadow:0 4px 18px rgba(124,58,237,0.4);"">
                          Definir Nova Senha
                        </a>
                      </div>

                      <!-- Aviso de expiração -->
                      <p style=""margin:0 0 20px;font-size:0.85rem;color:#888;
                                 text-align:center;line-height:1.5;"">
                        Se você não solicitou a alteração de senha, ignore este e-mail.
                      </p>

                      <!-- Link alternativo -->
                      <div style=""background:#f8f6ff;border:1px solid #e5dff8;
                                   border-radius:10px;padding:14px 16px;"">
                        <p style=""margin:0 0 6px;font-size:0.78rem;font-weight:700;
                                   color:#7c3aed;text-transform:uppercase;
                                   letter-spacing:0.06em;"">
                          Link não funciona?
                        </p>
                        <p style=""margin:0;font-size:0.8rem;color:#666;
                                   word-break:break-all;line-height:1.5;"">
                          Copie e cole o endereço abaixo no seu navegador:<br>
                          <span style=""color:#7c3aed;"">{_apiSettings.UIBaseUrl}{resetLink}</span>
                        </p>
                      </div>

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style=""background:#f8f6ff;padding:20px 40px;text-align:center;
                                border-top:1px solid #ede9f8;"">
                      <p style=""margin:0;font-size:0.8rem;color:#aaa;line-height:1.6;"">
                        © {DateTime.UtcNow.Year} RPGDex · Este é um email automático, não responda.<br>
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>

        </body>
        </html>";
    }
    public string GeneratePasswordResetConfirmationHTMLTemplate(string userName)
    {
      return $@"<!DOCTYPE html>
        <html lang=""pt-BR"">
        <head>
          <meta charset=""UTF-8"">
          <meta name=""viewport"" content=""width=device-width, initial-scale=1.0"">
          <title>Senha Alterada — RPGDex</title>
        </head>
        <body style=""margin:0;padding:0;background-color:#f4f2fb;font-family:'Segoe UI',Arial,sans-serif;"">

          <table width=""100%"" cellpadding=""0"" cellspacing=""0"" style=""background-color:#f4f2fb;padding:40px 20px;"">
            <tr>
              <td align=""center"">
                <table width=""100%"" cellpadding=""0"" cellspacing=""0""
                       style=""max-width:520px;background:#ffffff;border-radius:20px;
                               box-shadow:0 8px 40px rgba(100,60,200,0.12);overflow:hidden;"">

                  <!-- Header gradiente -->
                  <tr>
                    <td style=""background:linear-gradient(135deg,#7c3aed,#a855f7);
                                padding:40px 40px 32px;text-align:center;"">
                      <p style=""margin:0;font-family:'Segoe UI',Arial,sans-serif;
                                 font-weight:900;font-size:2rem;color:#ffffff;
                                 letter-spacing:-1px;"">RPGDex</p>
                      <p style=""margin:10px 0 0;font-size:0.9rem;color:rgba(255,255,255,0.8);"">
                        Sua plataforma de campanhas e fichas
                      </p>
                    </td>
                  </tr>

                  <!-- Corpo -->
                  <tr>
                    <td style=""padding:40px 40px 32px;"">

                      <div style=""text-align:center;margin-bottom:24px;"">
                        <div style=""display:inline-block;width:72px;height:72px;
                                     border-radius:50%;background:#f3eeff;
                                     border:3px solid #7c3aed;line-height:72px;
                                     font-size:2rem;color:#7c3aed;text-align:center;"">
                          ✅
                        </div>
                      </div>

                      <h1 style=""margin:0 0 8px;font-size:1.5rem;font-weight:800;
                                  color:#1a1033;text-align:center;"">
                        Senha Definida com Sucesso!
                      </h1>
                      <p style=""margin:0 0 24px;font-size:1rem;color:#555;
                                 text-align:center;line-height:1.6;"">
                        Olá, <strong style=""color:#7c3aed;"">{userName}</strong>!<br>
                        Gostaríamos de informar que sua senha de acesso foi cadastrada/redefinida com sucesso em <strong>{DateTime.UtcNow:dd/MM/yyyy HH:mm:ss} UTC</strong>.
                      </p>

                    </td>
                  </tr>

                  <!-- Footer -->
                  <tr>
                    <td style=""background:#f8f6ff;padding:20px 40px;text-align:center;
                                border-top:1px solid #ede9f8;"">
                      <p style=""margin:0;font-size:0.8rem;color:#aaa;line-height:1.6;"">
                        © {DateTime.UtcNow.Year} RPGDex · Este é um email automático, não responda.<br>
                      </p>
                    </td>
                  </tr>

                </table>
              </td>
            </tr>
          </table>

        </body>
        </html>";
    }
  }
}