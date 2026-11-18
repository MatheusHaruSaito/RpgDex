import {
  Component,
  EventEmitter,
  Input,
  Output,
  inject,
  ChangeDetectorRef,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth-service';
import { GoogleAuthService } from '../../services/google-auth-service';
import { UserResponse } from '../../../models/userResponse';
import { AuthOptionsResponse } from '../../../models/authOptionsResponse';
import { InfoHintComponent } from '../../components/info-hint/info-hint';
import { ErrorHandlerUtil } from '../../utils/error-handler.util';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, InfoHintComponent],
  templateUrl: './settings-modal.html',
  styleUrl: './settings-modal.css',
})
export class SettingsModalComponent implements OnChanges {
  private authService = inject(AuthService);
  private googleAuthService = inject(GoogleAuthService);
  private cdr = inject(ChangeDetectorRef);
  private translateService = inject(TranslateService);

  @Input() isOpen = false;
  @Input() user: UserResponse | null = null;
  @Input() authOptions: AuthOptionsResponse | null = null;
  @Input() feedBackMessageInput: { text: string; type: string } = { text: '', type: '' };

  @Output() closeModal = new EventEmitter<void>();
  @Output() twoFactorUpdated = new EventEmitter<boolean>();

  // Estados de 2FA
  isSending2FAEmail = false;
  isActivating2FA = false;
  twoFactorTokenInput = '';
  twoFactorStep: 'idle' | 'code-sent' = 'idle';

  // Estados de Vínculo OAuth
  isLinkingGoogle = false;
  isUnlinkingGoogle = false;
  isLinkingDiscord = false;
  isUnlinkingDiscord = false;

  // Estado de Solicitação de Senha
  isSendingPasswordReset = false;

  settingsMessage = { text: this.feedBackMessageInput.text, type: this.feedBackMessageInput.type };
  get isGoogleLinked(): boolean {
    return !!this.authOptions?.externalProviders?.some((p) => p.toLowerCase() === 'google');
  }

  get isDiscordLinked(): boolean {
    return !!this.authOptions?.externalProviders?.some((p) => p.toLowerCase() === 'discord');
  }

  get totalAuthMethodsCount(): number {
    if (!this.authOptions) return 0;
    const hasPasswordCount = this.authOptions.hasPassword ? 1 : 0;
    const externalCount = this.authOptions.externalProviders?.length || 0;
    return hasPasswordCount + externalCount;
  }

  get canUnlink(): boolean {
    // Só permite desvincular se houver mais de 1 método de login cadastrado
    return this.totalAuthMethodsCount > 1;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['feedBackMessageInput']) {
      this.settingsMessage = {
        text: this.feedBackMessageInput.text,
        type: this.feedBackMessageInput.type,
      };
    }
    if (changes['isOpen'] && changes['isOpen'].currentValue === true) {
      this.loadUserAuthOptions();
    }
  }

  loadUserAuthOptions(): void {
    const userId = this.authService.getLoggedUserId();
    if (!userId) return;

    this.authService.GetUserAuthOptions(userId).subscribe({
      next: (res: any) => {
        if (res && (res.data || res.success !== false)) {
          this.authOptions = res.data || res;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Erro ao recarregar opções de auth:', err);
        ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
          this.settingsMessage = { text: msg, type: 'error' };
          this.cdr.detectChanges();
        });
      },
    });
  }

  onClose(): void {
    this.twoFactorStep = 'idle';
    this.twoFactorTokenInput = '';
    this.isSendingPasswordReset = false;
    this.settingsMessage = { text: '', type: '' };
    this.closeModal.emit();
  }

  // ── VÍNCULO GOOGLE ──
  linkGoogleAccount(): void {
    this.isLinkingGoogle = true;
    this.settingsMessage = { text: '', type: '' };

    this.googleAuthService.initLogin((googleResponse: any) => {
      const idToken = googleResponse.credential;
      if (!idToken) {
        this.isLinkingGoogle = false;
        this.settingsMessage = { text: 'Falha ao obter token do Google.', type: 'error' };
        this.cdr.detectChanges();
        return;
      }

      this.authService.LinkGoogle(idToken).subscribe({
        next: (res: any) => {
          this.isLinkingGoogle = false;
          if (res?.success ?? true) {
            this.settingsMessage = { text: 'Conta Google vinculada com sucesso!', type: 'success' };
            this.loadUserAuthOptions();
          } else {
            this.settingsMessage = {
              text: res?.error || 'Erro ao vincular conta Google.',
              type: 'error',
            };
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isLinkingGoogle = false;
          ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
            this.settingsMessage = { text: msg, type: 'error' };
            this.cdr.detectChanges();
          });
        },
      });
    });

    this.googleAuthService.prompt();
  }

  unlinkGoogleAccount(): void {
    if (!this.canUnlink) return;

    this.isUnlinkingGoogle = true;
    this.settingsMessage = { text: '', type: '' };

    this.authService.UnlinkGoogle().subscribe({
      next: (res: any) => {
        this.isUnlinkingGoogle = false;
        if (res?.success ?? true) {
          this.settingsMessage = {
            text: 'Conta Google desvinculada com sucesso!',
            type: 'success',
          };
          this.loadUserAuthOptions();
        } else {
          this.settingsMessage = {
            text: res?.error || 'Erro ao desvincular conta Google.',
            type: 'error',
          };
        }
      },
    });
  }
  // ── SOLICITAR CRIAÇÃO / ALTERAÇÃO DE SENHA ──
  requestPasswordEmail(): void {
    if (!this.user?.email) {
      this.settingsMessage = { text: 'E-mail do usuário não localizado.', type: 'error' };
      return;
    }

    this.isSendingPasswordReset = true;
    this.settingsMessage = { text: '', type: '' };

    this.authService.SendResetPasswordEmail({ email: this.user.email }).subscribe({
      next: (res: any) => {
        this.isSendingPasswordReset = false;
        const isSuccess = res?.success ?? res?.isSuccess ?? true;

        if (isSuccess) {
          this.settingsMessage = {
            text: 'Enviamos as instruções para o seu e-mail para cadastrar/redefinir sua senha!',
            type: 'success',
          };
        } else {
          this.settingsMessage = {
            text: res?.message || res?.error || 'Erro ao enviar e-mail de redefinição.',
            type: 'error',
          };
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isUnlinkingGoogle = false;
        ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
          this.settingsMessage = { text: msg, type: 'error' };
          this.cdr.detectChanges();
        });
      },
    });
  }

  // ── VÍNCULO DISCORD ──
  linkDiscordAccount(): void {
    this.isLinkingDiscord = true;
    this.settingsMessage = { text: '', type: '' };

    this.authService.startDiscordLink().subscribe({
      next: (res: any) => {
        this.isLinkingDiscord = false;
        const redirectUrl = res?.data?.url || res?.url;

        if (redirectUrl) {
          // Redireciona o usuário para autorização do Discord
          window.location.href = redirectUrl;
        } else {
          this.settingsMessage = {
            text: 'URL de autenticação do Discord não recebida.',
            type: 'error',
          };
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.isLinkingDiscord = false;
        ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
          this.settingsMessage = { text: msg, type: 'error' };
          this.cdr.detectChanges();
        });
      },
    });
  }

  unlinkDiscordAccount(): void {
    if (!this.canUnlink) return;

    this.isUnlinkingDiscord = true;
    this.settingsMessage = { text: '', type: '' };

    this.authService.unlinkDiscord().subscribe({
      next: (res: any) => {
        this.isUnlinkingDiscord = false;
        if (res?.success ?? true) {
          this.settingsMessage = {
            text: 'Conta Discord desvinculada com sucesso!',
            type: 'success',
          };
          this.loadUserAuthOptions();
        } else {
          this.settingsMessage = {
            text: res?.error || 'Erro ao desvincular conta Discord.',
            type: 'error',
          };
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isUnlinkingDiscord = false;
        this.isSendingPasswordReset = false;
        ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
          this.settingsMessage = { text: msg, type: 'error' };
          this.cdr.detectChanges();
        });
      },
    });
  }

  // ── FLUXO 2FA ──
  request2FACode(): void {
    const userId = this.authService.getLoggedUserId();

    if (!userId) {
      this.settingsMessage = {
        text: 'Sessão inválida ou expirada. Faça login novamente.',
        type: 'error',
      };
      return;
    }

    this.isSending2FAEmail = true;
    this.settingsMessage = { text: '', type: '' };

    this.authService.SendTwoFactorAuthEmail({ email: this.user!.email }).subscribe({
      next: (response: any) => {
        this.isSending2FAEmail = false;
        const isSuccess = response?.success ?? response?.isSuccess ?? true;

        if (isSuccess) {
          this.twoFactorStep = 'code-sent';
          this.settingsMessage = {
            text: 'Código de verificação enviado para o seu e-mail!',
            type: 'success',
          };
        } else {
          this.settingsMessage = {
            text:
              response?.message || response?.error || 'Erro ao solicitar código de verificação.',
            type: 'error',
          };
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isSending2FAEmail = false;
        ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
          this.settingsMessage = { text: msg, type: 'error' };
          this.cdr.detectChanges();
        });
      },
    });
  }

  confirm2FAActivation(): void {
    if (!this.user?.email || !this.twoFactorTokenInput) return;

    this.isActivating2FA = true;
    this.settingsMessage = { text: '', type: '' };

    this.authService
      .TwoFAActivation({
        email: this.user.email,
        token: this.twoFactorTokenInput,
      })
      .subscribe({
        next: (res: any) => {
          this.isActivating2FA = false;
          const isSuccess = res?.success ?? res?.isSuccess ?? true;

          if (isSuccess) {
            this.settingsMessage = {
              text: 'Autenticação em duas etapas ativada com sucesso!',
              type: 'success',
            };
            this.twoFactorStep = 'idle';
            this.twoFactorTokenInput = '';

            if (this.authOptions) {
              this.authOptions.isTwoFactorEnabled = true;
            }

            this.twoFactorUpdated.emit(true);
            this.loadUserAuthOptions();
          } else {
            this.settingsMessage = {
              text: res?.message || 'Código inválido ou expirado.',
              type: 'error',
            };
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.isActivating2FA = false;
          ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
            this.settingsMessage = { text: msg, type: 'error' };
            this.cdr.detectChanges();
          });
        },
      });
  }
}
