import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { ErrorHandlerUtil } from '../../utils/error-handler.util';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forgot-password.html',
  styleUrls: ['./forgot-password.css'],
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private translateService = inject(TranslateService);
  private cdr = inject(ChangeDetectorRef);

  email: string = '';
  isLoading = false;
  message = { text: '', type: '' };

  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  get emailInvalid(): boolean {
    return this.email.length > 0 && !this.emailRegex.test(this.email);
  }

  onEmailInput(value: string): void {
    if (value) {
      this.email = value.replace(/\s+/g, '');
    }
  }

  sendResetEmail(): void {
    this.message = { text: '', type: '' };

    if (!this.email || !this.emailRegex.test(this.email)) {
      this.message = { text: 'Informe um e-mail válido.', type: 'error' };
      this.cdr.detectChanges();
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    this.authService.SendResetPasswordEmail({ email: this.email }).subscribe({
      next: (res: any) => {
        this.isLoading = false;
        const isSuccess = res?.success ?? res?.isSuccess ?? true;

        if (isSuccess) {
          this.message = {
            text: 'Enviamos as instruções e o link de redefinição para o seu e-mail!',
            type: 'success',
          };
        } else {
          this.message = {
            text: res?.message || 'Erro ao enviar e-mail de recuperação.',
            type: 'error',
          };
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.isLoading = false;
        this.message = {
          text: 'Erro ao enviar e-mail de recuperação. Tente novamente.',
          type: 'error',
        };
        this.cdr.detectChanges();

        ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
          this.message = { text: msg, type: 'error' };
          this.cdr.detectChanges();
        });
      },
    });
  }
}