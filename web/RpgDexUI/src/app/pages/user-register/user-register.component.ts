import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../services/auth-service';
import { RegisterUser } from '../../../models/registerUser';
import { GoogleAuthService } from '../../services/google-auth-service';
import { BrandLogo } from '../../components/brand-logo/brand-logo';
import { ErrorHandlerUtil } from '../../utils/error-handler.util';

@Component({
  selector: 'app-user-register',
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule, BrandLogo],
  templateUrl: './user-register.component.html',
  styleUrl: './user-register.component.css',
})
export class UserRegisterComponent implements OnInit {
  authService = inject(AuthService);
  private googleAuth = inject(GoogleAuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private translateService = inject(TranslateService);

  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  registerForm: RegisterUser = {
    userName: '',
    email: '',
    password: '',
  };

  confirmPassword = '';
  termsAccepted = false;
  hasReadTerms = false;
  isTermsModalOpen = false;

  showPassword = false;
  showConfirmPassword = false;

  isLoading = false;
  isGoogleLoading = false;
  isDiscordLoading = false;
  errorMessage = '';
  successMessage = '';

  get isAnyLoading(): boolean {
    return this.isLoading || this.isGoogleLoading || this.isDiscordLoading;
  }

  private setError(msg: string): void {
    this.errorMessage = msg;
    this.cdr.detectChanges();
  }

  private handleApiError(err: any): void {
    this.setError('Ocorreu um erro ao processar o seu pedido. Tente novamente.');
    ErrorHandlerUtil.parseApiError(err, this.translateService, (msg) => {
      if (msg && msg !== '[object Object]') {
        this.setError(msg);
      }
    });
  }

  ngOnInit(): void {
    this.googleAuth.initLogin((response: any) => {
      const token = response.credential;
      this.isGoogleLoading = true;
      this.errorMessage = '';
      this.cdr.detectChanges();

      this.authService.GoogleSingUp(token).subscribe({
        next: (res: any) => {
          this.isGoogleLoading = false;
          if (res?.success === false) {
            this.handleApiError({ error: res });
            return;
          }
          this.cdr.detectChanges();
          this.router.navigate(['/home']);
        },
        error: (err) => {
          this.isGoogleLoading = false;
          this.handleApiError(err);
        },
      });
    });

    this.googleAuth.renderButton('google-btn');
  }

  onUserNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input) return;

    const sanitized = input.value.toLowerCase().replace(/[^a-z0-9_]/g, '');

    this.registerForm.userName = sanitized;
    input.value = sanitized;
  }

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPasswordVisibility(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  onEmailInput(value: string): void {
    if (value) {
      this.registerForm.email = value.replace(/\s+/g, '');
    }
  }

  get hasMinLength(): boolean {
    return this.registerForm.password.length >= 8;
  }

  get hasUpper(): boolean {
    return /[A-Z]/.test(this.registerForm.password);
  }

  get hasLower(): boolean {
    return /[a-z]/.test(this.registerForm.password);
  }

  get hasNumber(): boolean {
    return /[0-9]/.test(this.registerForm.password);
  }

  get hasSpecial(): boolean {
    return /[^a-zA-Z0-9 ]/.test(this.registerForm.password);
  }

  get emailInvalid(): boolean {
    return this.registerForm.email.length > 0 && !this.emailRegex.test(this.registerForm.email);
  }

  get passwordsMismatch(): boolean {
    return this.confirmPassword.length > 0 && this.registerForm.password !== this.confirmPassword;
  }

  get passwordStrengthError(): string {
    if (this.registerForm.password.length === 0) return '';
    if (!this.hasMinLength) return 'A senha deve conter pelo menos 8 caracteres.';
    if (!this.hasUpper) return 'A senha deve conter pelo menos uma letra maiúscula.';
    if (!this.hasLower) return 'A senha deve conter pelo menos uma letra minúscula.';
    if (!this.hasNumber) return 'A senha deve conter pelo menos um número.';
    if (!this.hasSpecial) return 'A senha deve conter pelo menos um caracter especial.';
    return '';
  }

private isUserNameValid(userName: string): { valid: boolean; error?: string } {
    if (!userName) return { valid: false, error: 'O nome de usuário é obrigatório.' };

    const value = userName.toLowerCase().trim();
    const reservedWords = ['system', 'admin', 'rpgdex'];

    if (value.length < 2 || value.length > 32) {
      return { valid: false, error: 'O nome de usuário deve ter entre 2 e 32 caracteres.' };
    }

    if (!/^[a-z0-9_]{2,32}$/.test(value)) {
      return {
        valid: false,
        error:
          'Apenas letras minúsculas (a-z), números (0-9) e sublinhado (_) são permitidos.',
      };
    }

    if (reservedWords.some((word) => value.includes(word))) {
      return {
        valid: false,
        error: 'Este nome de usuário contém palavras reservadas e não pode ser usado.',
      };
    }

    return { valid: true };
  }

  openTermsModal(event?: Event): void {
    if (event) event.preventDefault();
    this.isTermsModalOpen = true;
  }

  closeTermsModal(): void {
    this.isTermsModalOpen = false;
  }

  acceptTermsAndClose(): void {
    this.hasReadTerms = true;
    this.termsAccepted = true;
    this.isTermsModalOpen = false;
    this.errorMessage = '';
    this.cdr.detectChanges();
  }

  onTermsCheckboxClick(event: MouseEvent): void {
    event.preventDefault();

    if (!this.hasReadTerms) {
      this.openTermsModal();
      this.setError('Por favor, leia os Termos de Uso no modal antes de aceitá-los.');
    } else {
      this.termsAccepted = !this.termsAccepted;
      this.cdr.detectChanges();
    }
  }

  loginComGoogle(): void {
    if (this.isAnyLoading) return;

    const googleBtn = document.querySelector('#google-btn div[role="button"]') as HTMLElement;
    if (googleBtn) {
      googleBtn.click();
    } else {
      this.googleAuth.prompt();
    }
  }

  Register(): void {
    this.errorMessage = '';
    this.successMessage = '';

    const rawUserName = this.registerForm.userName?.toLowerCase().trim() || '';
    this.registerForm.userName = rawUserName;

    const userValidation = this.isUserNameValid(rawUserName);
    if (!userValidation.valid) {
      this.setError(userValidation.error!);
      return;
    }

    if ('displayName' in this.registerForm) {
      (this.registerForm as any).displayName = rawUserName;
    }

    if (!this.registerForm.email || !this.registerForm.password || !this.confirmPassword) {
      this.setError('Preencha todos os campos.');
      return;
    }

    if (!this.emailRegex.test(this.registerForm.email)) {
      this.setError('Informe um email válido.');
      return;
    }

    if (this.passwordStrengthError) {
      this.setError(this.passwordStrengthError);
      return;
    }

    if (this.registerForm.password !== this.confirmPassword) {
      this.setError('As senhas não coincidem.');
      return;
    }

    if (!this.termsAccepted || !this.hasReadTerms) {
      this.setError('Você precisa abrir e aceitar os Termos de Uso antes de cadastrar.');
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    this.authService.Register(this.registerForm).subscribe({
      next: (res: any) => {
        this.isLoading = false;

        if (res?.success === false) {
          this.handleApiError({ error: res });
          return;
        }

        this.cdr.detectChanges();
        this.router.navigate(['/verificar-email'], {
          state: { email: this.registerForm.email },
        });
      },
      error: (err) => {
        console.log(err);
        this.isLoading = false;
        this.handleApiError(err);
      },
    });
  }

  onDiscordLogin(): void {
    if (this.isAnyLoading) return;
    this.isDiscordLoading = true;
    this.cdr.detectChanges();
    this.authService.DiscordSingUp();
  }
}
