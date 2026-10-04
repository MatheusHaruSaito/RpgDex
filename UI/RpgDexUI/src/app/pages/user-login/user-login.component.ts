import { Component, inject, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth-service';
import { FormsModule } from '@angular/forms';
import { LoginUser } from '../../../models/loginUser';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { GoogleAuthService } from '../../services/google-auth-service';
import { TwoFactorModalComponent } from '../../modals/two-factor-modal/two-factor-modal';

@Component({
  selector: 'app-user-login',
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule, TwoFactorModalComponent],
  templateUrl: './user-login.component.html',
  styleUrl: './user-login.component.css',
})
export class UserLoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private googleAuth = inject(GoogleAuthService);

  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  authUserForm: LoginUser = {
    email: '',
    password: '',
  };

  showPassword = false;
  isLoading = false;
  errorMessage = '';

  // Estado da modal 2FA
  showTwoFactorModal = false;

  get emailInvalid(): boolean {
    return this.authUserForm.email.length > 0 && !this.emailRegex.test(this.authUserForm.email);
  }

  onEmailInput(value: string): void {
    if (value) {
      this.authUserForm.email = value.replace(/\s+/g, '');
    }
  }

  ngOnInit(): void {
    this.googleAuth.initLogin((response: any) => {
      const token = response.credential;

      this.authService.GoogleSingUp(token).subscribe({
        next: () => {
          this.router.navigate(['/home']);
        },
        error: () => {
          this.errorMessage = 'Falha ao entrar com o Google. Tente novamente.';
        },
      });
    });

    this.googleAuth.renderButton('google-btn');
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  loginComGoogle(): void {
    const googleBtn = document.querySelector('#google-btn div[role="button"]') as HTMLElement;
    if (googleBtn) {
      googleBtn.click();
    } else {
      this.googleAuth.prompt();
    }
  }

  Login(): void {
    this.errorMessage = '';

    if (!this.emailRegex.test(this.authUserForm.email)) {
      this.errorMessage = 'Informe um email válido.';
      return;
    }

    if (!this.authUserForm.password) {
      this.errorMessage = 'Informe a sua senha.';
      return;
    }

    this.isLoading = true;
    this.authService.Login(this.authUserForm).subscribe({
      next: (res) => {
        this.isLoading = false;

        // Se o utilizador tem 2FA ativado
        if (res.data?.twoFactorEnabled) {
          // Dispara o e-mail com o código de 2FA e abre a modal
          this.authService.SendTwoFactorAuthEmail().subscribe({
            next: () => {
              this.showTwoFactorModal = true;
            },
            error: () => {
              // Mesmo se falhar o envio automático, abrimos a modal para permitir o reenvio
              this.showTwoFactorModal = true;
            },
          });
        } else {
          this.router.navigate(['/home']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.errorMessage = err?.error?.message || 'Falha ao entrar. Verifique seu email e senha.';
      },
    });
  }

  onTwoFactorAuthenticated(): void {
    this.showTwoFactorModal = false;
    this.router.navigate(['/home']);
  }

  onDiscordLogin(): void {
    this.authService.DiscordSingUp('');
  }
}