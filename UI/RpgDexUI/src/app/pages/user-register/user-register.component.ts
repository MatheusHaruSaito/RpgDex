import { Component, inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { RegisterUser } from '../../../models/registerUser';
import { CommonModule } from '@angular/common';
import { GoogleAuthService } from '../../services/google-auth-service';

@Component({
  selector: 'app-user-register',
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule],
  templateUrl: './user-register.component.html',
  styleUrl: './user-register.component.css',
})
export class UserRegisterComponent implements OnInit {
  authService = inject(AuthService);
  private googleAuth = inject(GoogleAuthService);
  private router = inject(Router);

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
  errorMessage = '';
  successMessage = '';

  ngOnInit(): void {
    this.googleAuth.initLogin((response: any) => {
      const token = response.credential;

      this.authService.GoogleSingUp(token).subscribe({
        next: () => {
          this.router.navigate(['/home']);
        },
        error: () => {
          this.errorMessage = 'Falha ao entrar com o Google. Verifique seu email e senha.';
        },
      });
    });

    this.googleAuth.renderButton('google-btn');
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

    if (!/^[a-z0-9_.]{2,32}$/.test(value)) {
      return {
        valid: false,
        error: 'Apenas letras minúsculas (a-z), números (0-9), sublinhado (_) e ponto (.) são permitidos.',
      };
    }

    if (value.includes('..')) {
      return { valid: false, error: 'O nome de usuário não pode conter pontos consecutivos (..).' };
    }

    if (reservedWords.some((word) => value.includes(word))) {
      return { valid: false, error: 'Este nome de usuário contém palavras reservadas e não pode ser usado.' };
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
  }

  onTermsCheckboxClick(event: MouseEvent): void {
    event.preventDefault();

    if (!this.hasReadTerms) {
      this.openTermsModal();
      this.errorMessage = 'Por favor, leia os Termos de Uso no modal antes de aceitá-los.';
    } else {
      this.termsAccepted = !this.termsAccepted;
    }
  }

  loginComGoogle(): void {
    const googleBtn = document.querySelector('#google-btn div[role="button"]') as HTMLElement;
    if (googleBtn) {
      googleBtn.click();
    } else {
      this.googleAuth.prompt();
    }
  }

  Register() {
    this.errorMessage = '';
    this.successMessage = '';

    const rawUserName = this.registerForm.userName?.toLowerCase().trim() || '';
    this.registerForm.userName = rawUserName;

    const userValidation = this.isUserNameValid(rawUserName);
    if (!userValidation.valid) {
      this.errorMessage = userValidation.error!;
      return;
    }

    if ('displayName' in this.registerForm) {
      (this.registerForm as any).displayName = rawUserName;
    }

    if (!this.registerForm.email || !this.registerForm.password || !this.confirmPassword) {
      this.errorMessage = 'Preencha todos os campos.';
      return;
    }

    if (!this.emailRegex.test(this.registerForm.email)) {
      this.errorMessage = 'Informe um email válido.';
      return;
    }

    if (this.passwordStrengthError) {
      this.errorMessage = this.passwordStrengthError;
      return;
    }

    if (this.registerForm.password !== this.confirmPassword) {
      this.errorMessage = 'As senhas não coincidem.';
      return;
    }

    if (!this.termsAccepted || !this.hasReadTerms) {
      this.errorMessage = 'Você precisa abrir e aceitar os Termos de Uso antes de cadastrar.';
      return;
    }

    this.isLoading = true;

    this.authService.Register(this.registerForm).subscribe({
      next: () => {
        this.isLoading = false;
        // Transmite o e-mail sem exibi-lo na barra de endereços (URL)
        this.router.navigate(['/verificar-email'], {
          state: { email: this.registerForm.email },
        });
      },
      error: (err) => {
        this.isLoading = false;
        const errors = err.error?.errors;
        if (errors) {
          const messages = Object.values(errors).flat() as string[];
          this.errorMessage = messages[0] ?? 'Dados inválidos. Verifique as informações.';
        } else if (err.status === 409 || err.error?.code === 'DuplicateUserName') {
          this.errorMessage = 'Este nome de usuário já está em uso.';
        } else if (err.status === 409 || err.error?.code === 'DuplicateEmail') {
          this.errorMessage = 'Este e-mail já está cadastrado.';
        } else {
          this.errorMessage = 'Ocorreu um erro ao criar a conta. Tente novamente.';
        }
      },
    });
  }

  onDiscordLogin() {
    this.authService.DiscordSingUp();
  }
}