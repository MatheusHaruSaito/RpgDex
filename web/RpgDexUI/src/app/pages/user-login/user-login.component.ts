import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { AuthService } from '../../services/auth-service';
import { FormsModule } from '@angular/forms';
import { LoginUser } from '../../../models/loginUser';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TranslateService } from '@ngx-translate/core';
import { GoogleAuthService } from '../../services/google-auth-service';
import { TwoFactorModalComponent } from '../../modals/two-factor-modal/two-factor-modal';
import { BrandLogo } from '../../components/brand-logo/brand-logo';
import { ErrorHandlerUtil } from '../../utils/error-handler.util';

@Component({
  selector: 'app-user-login',
  standalone: true,
  imports: [FormsModule, RouterModule, CommonModule, TwoFactorModalComponent, BrandLogo],
  templateUrl: './user-login.component.html',
  styleUrl: './user-login.component.css',
})
export class UserLoginComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private googleAuth = inject(GoogleAuthService);
  private cdr = inject(ChangeDetectorRef);
  private translateService = inject(TranslateService);

  private emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  authUserForm: LoginUser = {
    email: '',
    password: '',
  };

  showPassword = false;
  isLoading = false;
  isGoogleLoading = false;
  isDiscordLoading = false;
  errorMessage = '';

  showTwoFactorModal = false;

  get emailInvalid(): boolean {
    return this.authUserForm.email.length > 0 && !this.emailRegex.test(this.authUserForm.email);
  }

  get isAnyLoading(): boolean {
    return this.isLoading || this.isGoogleLoading || this.isDiscordLoading;
  }

  onEmailInput(value: string): void {
    if (value) {
      this.authUserForm.email = value.replace(/\s+/g, '');
    }
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

  togglePasswordVisibility(): void {
    this.showPassword = !this.showPassword;
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

  Login(): void {
    this.errorMessage = '';

    if (!this.emailRegex.test(this.authUserForm.email)) {
      this.setError('Informe um email válido.');
      return;
    }

    if (!this.authUserForm.password) {
      this.setError('Informe a sua senha.');
      return;
    }

    this.isLoading = true;
    this.cdr.detectChanges();

    this.authService.Login(this.authUserForm).subscribe({
      next: (res: any) => {
        this.isLoading = false;

        if (res?.success === false) {
          this.handleApiError({ error: res });
          return;
        }

        if (res.data?.twoFactorEnabled) {
          this.showTwoFactorModal = true;
          this.cdr.detectChanges();
        } else {
          this.cdr.detectChanges();
          this.router.navigate(['/home']);
        }
      },
      error: (err) => {
        this.isLoading = false;
        this.handleApiError(err);
      },
    });
  }

  onTwoFactorAuthenticated(): void {
    this.showTwoFactorModal = false;
    this.cdr.detectChanges();
    this.router.navigate(['/home']);
  }

  onDiscordLogin(): void {
    if (this.isAnyLoading) return;
    this.isDiscordLoading = true;
    this.cdr.detectChanges();
    this.authService.DiscordSingUp('');
  }
}