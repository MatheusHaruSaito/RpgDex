import { Component, EventEmitter, Input, Output, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth-service';
import { ValidateTwoFactorRequest } from '../../../models/validateTwoFactorRequest';

@Component({
  selector: 'app-two-factor-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './two-factor-modal.html',
  styleUrl: './two-factor-modal.css',
})
export class TwoFactorModalComponent {
  @Input() visible = false;
  @Input() userEmail = '';
  @Output() close = new EventEmitter<void>();
  @Output() authenticated = new EventEmitter<void>();

  private authService = inject(AuthService);
  private cdr = inject(ChangeDetectorRef);

  code = '';
  isLoading = false;
  errorMessage = '';
  resendSuccess = false;

  onCodeInput(value: string): void {
    this.code = value.replace(/\D/g, '').substring(0, 6);
  }

  verifyCode(): void {
    if (this.code.length !== 6) {
      this.errorMessage = 'O código deve conter exatamente 6 dígitos.';
      return;
    }

    if (!this.userEmail) {
      this.errorMessage = 'E-mail do usuário não informado.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';
    this.resendSuccess = false;

    const request: ValidateTwoFactorRequest = {
      email: this.userEmail,
      token: this.code,
    };

    this.authService.ValidateTwoFactor(request).subscribe({
      next: (response) => {
        this.isLoading = false;
        if (response.success && response.data?.accessToken) {
          this.authService.StoreToken(response.data.accessToken, response.data.refreshToken);
          this.authenticated.emit();
        } else {
          this.errorMessage = response.message || 'Código inválido ou expirado.';
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Código inválido ou expirado.';
        this.cdr.detectChanges();
      },
    });
  }

  resendCode(): void {
    this.errorMessage = '';
    this.resendSuccess = false;

    this.authService.SendTwoFactorAuthEmail().subscribe({
      next: () => {
        this.resendSuccess = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = err?.error?.message || 'Erro ao reenviar o código.';
        this.cdr.detectChanges();
      },
    });
  }

  onClose(): void {
    this.code = '';
    this.errorMessage = '';
    this.resendSuccess = false;
    this.close.emit();
  }
}