import { ChangeDetectorRef, Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth-service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-email-confirmation',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './email-confirmation.html',
  styleUrl: './email-confirmation.css',
})
export class EmailConfirmation implements OnInit {
  userid: string | null = null;
  token: string | null = null;
  message: string | undefined = 'Aguardando Verificação de Email...';

  /** Controla qual estado visual exibir: waiting | success | error */
  state: 'waiting' | 'success' | 'error' = 'waiting';

  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);
  private router = inject(Router);

  constructor(private route: ActivatedRoute) {}

  ngOnInit() {
    this.route.queryParamMap.subscribe((params) => {
      this.userid = params.get('userid');
      this.token = params.get('token');

      if (this.userid && this.token) {
        const request: { userId: string; token: string } = {
          userId: this.userid,
          token: this.token,
        };

        this.authService.ValidateEmailByToken(request).subscribe({
          next: (response) => {
            this.message = response.data;
            this.state = 'success';
            this.cdr.detectChanges();
          },
          error: (error) => {
            this.message = error.error?.message || error.message || 'Erro ao validar confirmação de e-mail.';
            this.state = 'error';
            this.cdr.detectChanges();
          },
        });
      } else {
        this.message = 'Link de confirmação inválido ou incompleto.';
        this.state = 'error';
        this.cdr.detectChanges();
      }
    });
  }

  backToLogin() {
    this.router.navigate(['/login']);
  }
}