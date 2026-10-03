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
import { AuthService } from '../../services/auth-service';
import { UserResponse } from '../../../models/userResponse';
import { AuthOptionsResponse } from '../../../models/authOptionsResponse';
import { InfoHintComponent } from '../../components/info-hint/info-hint';

@Component({
  selector: 'app-settings-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, InfoHintComponent],
  templateUrl: './settings-modal.html',
  styleUrl: './settings-modal.css',
})
export class SettingsModalComponent implements OnChanges {
  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  @Input() isOpen = false;
  @Input() user: UserResponse | null = null;
  @Input() authOptions: AuthOptionsResponse | null = null;

  @Output() closeModal = new EventEmitter<void>();
  @Output() twoFactorUpdated = new EventEmitter<boolean>();

  isSending2FAEmail = false;
  isActivating2FA = false;
  twoFactorTokenInput = '';
  twoFactorStep: 'idle' | 'code-sent' = 'idle';
  settingsMessage = { text: '', type: '' };

  ngOnChanges(changes: SimpleChanges): void {
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
      error: (err) => console.error('Erro ao recarregar opções de auth:', err),
    });
  }

  onClose(): void {
    this.twoFactorStep = 'idle';
    this.twoFactorTokenInput = '';
    this.settingsMessage = { text: '', type: '' };
    this.closeModal.emit();
  }

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

    this.authService.SendTwoFactorAuthEmail().subscribe({
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
        console.error('Erro na requisição do 2FA:', err);
        this.isSending2FAEmail = false;
        this.settingsMessage = {
          text: err?.error?.message || 'Erro ao enviar código. Tente novamente.',
          type: 'error',
        };
        this.cdr.detectChanges();
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
          this.settingsMessage = {
            text: err?.error?.message || 'Falha ao validar o código.',
            type: 'error',
          };
          this.cdr.detectChanges();
        },
      });
  }
}