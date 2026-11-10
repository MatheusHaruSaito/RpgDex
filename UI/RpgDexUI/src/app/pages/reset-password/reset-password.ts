import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth-service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './reset-password.html',
  styleUrls: ['./reset-password.css'],
})
export class ResetPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private authService = inject(AuthService);

  email: string = '';
  token: string = '';
  newPassword: string = '';
  confirmPassword: string = '';

  showNewPassword = false;
  showConfirmPassword = false;

  isLoading = false;
  message = { text: '', type: '' };

  ngOnInit(): void {
    this.email = this.route.snapshot.queryParamMap.get('email') || '';
    this.token = this.route.snapshot.queryParamMap.get('token') || '';

    if (!this.email || !this.token) {
      this.message = {
        text: 'Link de redefinição inválido ou incompleto.',
        type: 'error',
      };
    }
  }

  submitNewPassword(): void {
    if (!this.newPassword || !this.confirmPassword) {
      this.message = { text: 'Preencha os campos de senha.', type: 'error' };
      return;
    }

    if (this.newPassword !== this.confirmPassword) {
      this.message = { text: 'As senhas não coincidem.', type: 'error' };
      return;
    }

    this.isLoading = true;
    this.message = { text: '', type: '' };

    this.authService
      .ResetPassword({
        email: this.email, // A API utiliza o userId codificado e o token
        token: this.token,
        newPassword: this.newPassword,
      })
      .subscribe({
        next: (res: any) => {
          this.isLoading = false;
          const isSuccess = res?.success ?? res?.isSuccess ?? true;

          if (isSuccess) {
            this.message = {
              text: 'Senha definida com sucesso! Redirecionando para o login...',
              type: 'success',
            };
            setTimeout(() => {
              this.router.navigate(['/login']);
            }, 2500);
          } else {
            this.message = {
              text: res?.message || 'Erro ao redefinir a senha. O token pode ter expirado.',
              type: 'error',
            };
          }
        },
        error: (err) => {
          this.isLoading = false;
          this.message = {
            text: 'Falha ao comunicar com o servidor. Tente novamente mais tarde.',
            type: 'error',
          };
        },
      });
  }
}
