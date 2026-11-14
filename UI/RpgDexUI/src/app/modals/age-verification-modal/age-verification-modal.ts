import {
  Component,
  EventEmitter,
  Input,
  Output,
  OnChanges,
  OnDestroy,
  SimpleChanges,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth-service';
import { ErrorHandlerUtil } from '../../utils/error-handler.util';

@Component({
  selector: 'app-age-verification-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './age-verification-modal.html',
  styleUrl: './age-verification-modal.css',
})
export class AgeVerificationModalComponent implements OnChanges, OnDestroy {
  private authService = inject(AuthService);
  private translateService = inject(TranslateService);
  private router = inject(Router);
  private cooldownTimer: ReturnType<typeof setInterval> | null = null;

  @Input() visible = false;
  @Input() blocking = true;
  @Input() initialPending = false;
  @Output() close = new EventEmitter<void>();
  @Output() verified = new EventEmitter<{ isMinor: boolean }>();

  birthDate = signal<string>('');
  cpf = signal<string>('');
  guardianCpf = signal<string>('');
  guardianEmail = signal<string>('');

  isLoading = signal<boolean>(false);
  isResending = signal<boolean>(false);
  resendCooldown = signal<number>(0);
  errorMessage = signal<string>('');
  resendMessage = signal<string>('');
  pendingGuardianApproval = signal<boolean>(false);
  editingGuardianEmail = signal<boolean>(false);
  newGuardianEmail = signal<string>('');

  readonly todayStr = new Date().toISOString().split('T')[0];

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['initialPending'] || changes['visible']) {
      if (this.visible && this.initialPending) {
        this.pendingGuardianApproval.set(true);
      }
    }
  }

  ngOnDestroy(): void {
    if (this.cooldownTimer) {
      clearInterval(this.cooldownTimer);
    }
  }

  isMinor = computed<boolean>(() => {
    const dob = this.birthDate();
    if (!dob) return false;

    const birth = new Date(`${dob}T00:00:00`);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();

    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age < 18;
  });

  formatCpf(value: string, target: 'user' | 'guardian'): void {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    const masked = digits
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');

    if (target === 'user') {
      this.cpf.set(masked);
    } else {
      this.guardianCpf.set(masked);
    }
  }

  private isValidCpf(cpfMasked: string): boolean {
    const digits = cpfMasked.replace(/\D/g, '');
    if (digits.length !== 11 || /^(\d)\1+$/.test(digits)) return false;

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(digits[i], 10) * (10 - i);
    let rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    if (rev !== parseInt(digits[9], 10)) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(digits[i], 10) * (11 - i);
    rev = 11 - (sum % 11);
    if (rev === 10 || rev === 11) rev = 0;
    return rev === parseInt(digits[10], 10);
  }

  private startCooldown(seconds = 60): void {
    this.resendCooldown.set(seconds);
    if (this.cooldownTimer) clearInterval(this.cooldownTimer);

    this.cooldownTimer = setInterval(() => {
      const current = this.resendCooldown();
      if (current <= 1) {
        this.resendCooldown.set(0);
        if (this.cooldownTimer) clearInterval(this.cooldownTimer);
      } else {
        this.resendCooldown.set(current - 1);
      }
    }, 1000);
  }

  submit(): void {
    this.errorMessage.set('');

    if (!this.birthDate()) {
      this.errorMessage.set('Informe sua data de nascimento.');
      return;
    }

    if (!this.isValidCpf(this.cpf())) {
      this.errorMessage.set('Informe um CPF válido.');
      return;
    }

    const minor = this.isMinor();

    if (minor) {
      if (!this.isValidCpf(this.guardianCpf())) {
        this.errorMessage.set('Informe um CPF válido para o responsável legal.');
        return;
      }
      if (this.cpf().replace(/\D/g, '') === this.guardianCpf().replace(/\D/g, '')) {
        this.errorMessage.set('O CPF do responsável deve ser diferente do seu CPF.');
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.guardianEmail().trim())) {
        this.errorMessage.set('Informe um e-mail válido do responsável legal.');
        return;
      }
    }

    this.isLoading.set(true);

    this.authService
      .AgeVerification({
        birthDate: this.birthDate(),
        cpf: this.cpf().replace(/\D/g, ''),
        guardianCpf: minor ? this.guardianCpf().replace(/\D/g, '') : null,
        guardianEmail: minor ? this.guardianEmail().trim() : null,
      })
      .subscribe({
        next: (res) => {
          this.isLoading.set(false);
          if (!res.success) {
            this.errorMessage.set(res.message || 'Não foi possível validar seus dados.');
            return;
          }

          if (minor) {
            this.pendingGuardianApproval.set(true);
            this.startCooldown(60);
          } else {
            this.verified.emit({ isMinor: false });
            this.close.emit();
          }
        },
        error: (err) => {
          this.isLoading.set(false);
          this.errorMessage.set('Erro ao processar a verificação de idade.');
          ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
            if (msg) this.errorMessage.set(msg);
          });
        },
      });
  }

  resendConsent(): void {
    if (this.isResending() || (!this.editingGuardianEmail() && this.resendCooldown() > 0)) return;

    this.errorMessage.set('');
    this.resendMessage.set('');

    const updatedEmail = this.editingGuardianEmail() ? this.newGuardianEmail().trim() : null;

    if (this.editingGuardianEmail()) {
      if (!updatedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(updatedEmail)) {
        this.errorMessage.set('Informe um e-mail válido para o responsável.');
        return;
      }
    }

    this.isResending.set(true);

    this.authService
      .resendGuardianConsentEmail({ guardianEmail: updatedEmail || null })
      .subscribe({
        next: (res) => {
          this.isResending.set(false);
          if (!res.success) {
            this.errorMessage.set(res.message || 'Não foi possível reenviar o e-mail.');
            return;
          }

          if (updatedEmail) {
            this.guardianEmail.set(updatedEmail);
            this.editingGuardianEmail.set(false);
            this.newGuardianEmail.set('');
          }

          this.resendMessage.set('Novo link enviado para o e-mail do responsável!');
          this.startCooldown(60);
        },
        error: (err) => {
          this.isResending.set(false);
          this.errorMessage.set('Aguarde antes de solicitar um novo envio.');
          ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
            if (msg) this.errorMessage.set(msg);
          });
        },
      });
  }

  logout(): void {
    this.authService.Logout();
    this.close.emit();
    this.router.navigate(['/login']);
  }
}